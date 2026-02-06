/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.server;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * WhatsApp OTP Sample Server - Java Implementation.
 *
 * <p>A simple HTTP server that generates and verifies OTP codes sent via
 * WhatsApp Business API authentication templates.
 *
 * <h2>Security Features:</h2>
 * <ul>
 *   <li>Cryptographically secure OTP generation using SecureRandom</li>
 *   <li>SHA-256 hashing for OTP storage (plaintext never persisted)</li>
 *   <li>Constant-time comparison to prevent timing attacks</li>
 *   <li>Maximum verification attempts (3) to prevent brute force</li>
 *   <li>OTP expiry after 5 minutes</li>
 *   <li>One-time use (code deleted after successful verification)</li>
 * </ul>
 *
 * @author Meta Platforms, Inc.
 */
public class OtpServer {

    /** Server port number. */
    private static final int PORT = 3000;

    /** Number of digits in the OTP code. */
    private static final int CODE_LENGTH = 6;

    /** OTP code expiry time in minutes. */
    private static final int CODE_LIFETIME_MINUTES = 5;

    /** Maximum allowed verification attempts before OTP is invalidated. */
    private static final int MAX_VERIFICATION_ATTEMPTS = 3;

    /** WhatsApp Graph API version. */
    private static final String API_VERSION = "v21.0";

    /** Configuration filename. */
    private static final String CONFIG_FILENAME = "whatsapp-info.json";

    /** Thread-safe storage for active OTP codes. */
    private static final Map<String, OtpData> activeCodes = new ConcurrentHashMap<>();

    /** Cryptographically secure random number generator. */
    private static final SecureRandom secureRandom = new SecureRandom();

    /** WhatsApp configuration. */
    private static WhatsAppConfig config;

    /** Template name for sending OTP messages. */
    private static String templateName;

    /**
     * Stores OTP data including the hashed code and metadata.
     */
    static class OtpData {
        final String codeHash;
        final Instant expirationTimestamp;
        int attempts;

        OtpData(String codeHash, Instant expirationTimestamp) {
            this.codeHash = codeHash;
            this.expirationTimestamp = expirationTimestamp;
            this.attempts = 0;
        }
    }

    /**
     * WhatsApp API configuration loaded from JSON file.
     */
    static class WhatsAppConfig {
        String wabaId;
        String accessToken;
        String phoneNumberId;
        String templateId;
    }

    /**
     * Generates a cryptographically secure OTP code.
     *
     * <p>Uses {@link SecureRandom} which provides cryptographically strong
     * random number generation suitable for security-sensitive applications.
     *
     * @return A 6-digit numeric OTP code as a string
     */
    private static String generateCode() {
        int min = (int) Math.pow(10, CODE_LENGTH - 1);
        int max = (int) Math.pow(10, CODE_LENGTH) - 1;
        int code = min + secureRandom.nextInt(max - min + 1);
        return String.format("%0" + CODE_LENGTH + "d", code);
    }

    /**
     * Computes the SHA-256 hash of an OTP code.
     *
     * <p>The plaintext code is never stored - only the hash is persisted.
     * This ensures that even if the storage is compromised, the actual
     * codes cannot be recovered.
     *
     * @param code The plaintext OTP code to hash
     * @return The SHA-256 hash as a hexadecimal string (64 characters)
     */
    private static String hashCode(String code) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(code.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    /**
     * Verifies a provided OTP code against a stored hash using constant-time comparison.
     *
     * <p>Uses a constant-time comparison algorithm to prevent timing attacks,
     * where an attacker could measure response times to deduce correct characters.
     *
     * @param providedCode The code submitted by the user for verification
     * @param storedHash The SHA-256 hash of the correct OTP code
     * @return {@code true} if the provided code matches, {@code false} otherwise
     */
    private static boolean verifyCode(String providedCode, String storedHash) {
        String providedHash = hashCode(providedCode);
        if (providedHash.length() != storedHash.length()) {
            return false;
        }
        // Constant-time comparison
        int result = 0;
        for (int i = 0; i < providedHash.length(); i++) {
            result |= providedHash.charAt(i) ^ storedHash.charAt(i);
        }
        return result == 0;
    }

    /**
     * Logs the current state of active OTP codes (with truncated hashes).
     */
    private static void logActiveCodes() {
        System.out.println("Active codes state (hashes shown, not plaintext):");
        activeCodes.forEach((phone, data) -> {
            String truncatedHash = data.codeHash.substring(0, 16) + "...";
            System.out.printf("  %s: hash=%s, expires=%s, attempts=%d%n",
                    phone, truncatedHash, data.expirationTimestamp, data.attempts);
        });
    }

    /**
     * Loads WhatsApp configuration from the setup JSON file.
     *
     * @throws IOException if the configuration file cannot be read
     */
    private static void loadConfig() throws IOException {
        Path configPath = Path.of("..", "setup", CONFIG_FILENAME);
        if (!Files.exists(configPath)) {
            configPath = Path.of("setup", CONFIG_FILENAME);
        }

        String content = Files.readString(configPath);
        config = parseConfig(content);

        if (config.wabaId == null || config.accessToken == null ||
            config.phoneNumberId == null || config.templateId == null) {
            throw new IOException("Missing required fields in " + CONFIG_FILENAME);
        }
    }

    /**
     * Parses the JSON configuration file (simple parser for minimal dependencies).
     */
    private static WhatsAppConfig parseConfig(String json) {
        WhatsAppConfig cfg = new WhatsAppConfig();
        cfg.wabaId = extractJsonValue(json, "waba_id");
        cfg.accessToken = extractJsonValue(json, "access_token");
        cfg.phoneNumberId = extractJsonValue(json, "phone_number_id");
        cfg.templateId = extractJsonValue(json, "template_id");
        return cfg;
    }

    /**
     * Extracts a string value from JSON (simple regex-based parser).
     */
    private static String extractJsonValue(String json, String key) {
        Pattern pattern = Pattern.compile("\"" + key + "\"\\s*:\\s*\"([^\"]+)\"");
        Matcher matcher = pattern.matcher(json);
        return matcher.find() ? matcher.group(1) : null;
    }

    /**
     * Fetches the template name from the WhatsApp API.
     *
     * @throws IOException if the API call fails
     */
    private static void fetchTemplateName() throws IOException {
        String urlStr = String.format(
                "https://graph.facebook.com/%s/%s/message_templates?access_token=%s",
                API_VERSION, config.wabaId, config.accessToken);

        while (urlStr != null) {
            URL url = URI.create(urlStr).toURL();
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }

                String json = response.toString();

                // Find our template
                Pattern idPattern = Pattern.compile("\"id\"\\s*:\\s*\"([^\"]+)\"");
                Pattern namePattern = Pattern.compile("\"name\"\\s*:\\s*\"([^\"]+)\"");
                Pattern statusPattern = Pattern.compile("\"status\"\\s*:\\s*\"([^\"]+)\"");

                Matcher idMatcher = idPattern.matcher(json);
                Matcher nameMatcher = namePattern.matcher(json);
                Matcher statusMatcher = statusPattern.matcher(json);

                while (idMatcher.find()) {
                    String id = idMatcher.group(1);
                    if (nameMatcher.find() && statusMatcher.find()) {
                        String name = nameMatcher.group(1);
                        String status = statusMatcher.group(1);

                        if (id.equals(config.templateId)) {
                            if (!"APPROVED".equals(status)) {
                                throw new IOException("Template not approved: " + status);
                            }
                            templateName = name;
                            return;
                        }
                    }
                }

                // Check for next page
                Pattern nextPattern = Pattern.compile("\"next\"\\s*:\\s*\"([^\"]+)\"");
                Matcher nextMatcher = nextPattern.matcher(json);
                urlStr = nextMatcher.find() ? nextMatcher.group(1).replace("\\/", "/") : null;
            }
        }

        throw new IOException("Template not found: " + config.templateId);
    }

    /**
     * Handles OTP requests (GET and POST).
     */
    static class OtpHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            System.out.println("Current time: " + Instant.now());

            String path = exchange.getRequestURI().getPath();
            String phone = path.replaceFirst("/otp/", "").replaceAll("/$", "");

            try {
                if ("GET".equals(exchange.getRequestMethod())) {
                    handleSendOtp(exchange, phone);
                } else if ("POST".equals(exchange.getRequestMethod())) {
                    handleVerifyOtp(exchange, phone);
                } else {
                    sendResponse(exchange, 405, "Method not allowed");
                }
            } finally {
                logActiveCodes();
            }
        }

        /**
         * Handles GET /otp/:phone_number - generates and sends OTP.
         */
        private void handleSendOtp(HttpExchange exchange, String phone) throws IOException {
            System.out.println("OTP requested for phone # " + phone);

            String code = generateCode();
            Instant expirationTimestamp = Instant.now().plus(CODE_LIFETIME_MINUTES, ChronoUnit.MINUTES);

            // Send via WhatsApp API
            String sendMessageUrl = String.format(
                    "https://graph.facebook.com/%s/%s/messages",
                    API_VERSION, config.phoneNumberId);

            String payload = String.format("""
                    {
                        "messaging_product": "whatsapp",
                        "recipient_type": "individual",
                        "to": "%s",
                        "type": "template",
                        "template": {
                            "name": "%s",
                            "language": {"code": "en_US", "policy": "deterministic"},
                            "components": [
                                {"type": "body", "parameters": [{"type": "text", "text": "%s"}]},
                                {"type": "button", "sub_type": "url", "index": "0",
                                 "parameters": [{"type": "text", "text": "%s"}]}
                            ]
                        }
                    }""", phone, templateName, code, code);

            try {
                URL url = URI.create(sendMessageUrl).toURL();
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Authorization", "Bearer " + config.accessToken);
                conn.setDoOutput(true);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(payload.getBytes(StandardCharsets.UTF_8));
                }

                if (conn.getResponseCode() != 200) {
                    System.out.println("Error from WhatsApp API: " + conn.getResponseCode());
                    sendResponse(exchange, 500, "Error calling send message API. Check server logs.");
                    return;
                }
            } catch (Exception e) {
                System.out.println("Error sending message: " + e.getMessage());
                sendResponse(exchange, 500, "Error calling send message API. Check server logs.");
                return;
            }

            // Store hashed code
            activeCodes.put(phone, new OtpData(hashCode(code), expirationTimestamp));

            System.out.printf("Response (%d): OK%n", 200);
            sendResponse(exchange, 200, "");
        }

        /**
         * Handles POST /otp/:phone_number - verifies OTP.
         */
        private void handleVerifyOtp(HttpExchange exchange, String phone) throws IOException {
            System.out.println("OTP validation request for phone # " + phone);

            OtpData activeCode = activeCodes.get(phone);
            if (activeCode == null) {
                String msg = "No active code for phone # " + phone;
                System.out.printf("Response (%d): %s%n", 404, msg);
                sendResponse(exchange, 404, msg);
                return;
            }

            // Read request body
            String body;
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8))) {
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                body = sb.toString();
            }

            String providedCode = extractJsonValue(body, "code");
            if (providedCode == null || providedCode.isEmpty()) {
                System.out.printf("Response (%d): No code provided.%n", 400);
                sendResponse(exchange, 400, "No code provided.");
                return;
            }

            // Check expiration
            if (Instant.now().isAfter(activeCode.expirationTimestamp)) {
                activeCodes.remove(phone);
                String msg = "Code has expired, please request another.";
                System.out.printf("Response (%d): %s%n", 401, msg);
                sendResponse(exchange, 401, msg);
                return;
            }

            // Check max attempts
            if (activeCode.attempts >= MAX_VERIFICATION_ATTEMPTS) {
                activeCodes.remove(phone);
                String msg = "Too many failed attempts, please request a new code.";
                System.out.printf("Response (%d): %s%n", 401, msg);
                sendResponse(exchange, 401, msg);
                return;
            }

            // Verify code
            if (!verifyCode(providedCode, activeCode.codeHash)) {
                activeCode.attempts++;
                if (activeCode.attempts >= MAX_VERIFICATION_ATTEMPTS) {
                    activeCodes.remove(phone);
                    String msg = "Too many failed attempts, please request a new code.";
                    System.out.printf("Response (%d): %s%n", 401, msg);
                    sendResponse(exchange, 401, msg);
                    return;
                }
                int remaining = MAX_VERIFICATION_ATTEMPTS - activeCode.attempts;
                String msg = String.format("Incorrect code. %d attempt(s) remaining.", remaining);
                System.out.printf("Response (%d): %s%n", 401, msg);
                sendResponse(exchange, 401, msg);
                return;
            }

            // Success
            activeCodes.remove(phone);
            System.out.printf("Response (%d): OK%n", 200);
            sendResponse(exchange, 200, "");
        }

        /**
         * Sends an HTTP response.
         */
        private void sendResponse(HttpExchange exchange, int statusCode, String message) throws IOException {
            byte[] bytes = message.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(statusCode, bytes.length > 0 ? bytes.length : -1);
            if (bytes.length > 0) {
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(bytes);
                }
            }
            exchange.close();
        }
    }

    /**
     * Main entry point.
     *
     * @param args Command line arguments (not used)
     * @throws Exception if server startup fails
     */
    public static void main(String[] args) throws Exception {
        // Load configuration
        try {
            loadConfig();
        } catch (IOException e) {
            System.err.println("Configuration error: " + e.getMessage());
            System.err.println("Please run setup.py first.");
            System.exit(1);
        }

        // Fetch template name
        try {
            fetchTemplateName();
        } catch (IOException e) {
            System.err.println("Template error: " + e.getMessage());
            System.exit(1);
        }

        System.out.printf("Verified OTP template '%s' with ID %s is approved and ready to send.%n",
                templateName, config.templateId);

        // Start server
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        server.createContext("/otp/", new OtpHandler());
        server.setExecutor(Executors.newFixedThreadPool(10));
        server.start();

        System.out.println("Sample app listening on port " + PORT);
    }
}

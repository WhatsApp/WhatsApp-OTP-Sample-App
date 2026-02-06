/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Foundation

class OtpRequestHelper {
    // MARK: - Async/Await API (iOS 15+)

    static func requestOtp(
        type: OtpType,
        to phoneNumber: String,
        token: String? = nil
    ) async -> OtpRequestError? {
        guard let url = OtpRequestUrl(phoneNumber: phoneNumber).url() else {
            return .urlInvalid
        }

        do {
            let (_, response) = try await get(url: url, token: token)
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 200
            if statusCode < 300 {
                return nil
            } else {
                return .general("Request failed with status code \(statusCode)")
            }
        } catch {
            return .general(error.localizedDescription)
        }
    }

    class func get(url: URL, token: String?) async throws -> (Data, URLResponse) {
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let token {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        return try await URLSession.shared.data(for: request)
    }

    class func post(url: URL, payload: Data, token: String?) async throws -> (Data, URLResponse) {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Accept")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = payload
        if let token {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        return try await URLSession.shared.data(for: request)
    }

    // MARK: - Legacy Closure-based API (deprecated, for backward compatibility)

    @available(*, deprecated, message: "Use async/await version instead")
    static func requestOtp(
        type: OtpType,
        to phoneNumber: String,
        token: String? = nil,
        completion: @escaping (OtpRequestError?) -> Void
    ) {
        guard let url = OtpRequestUrl(phoneNumber: phoneNumber).url() else {
            completion(.urlInvalid)
            return
        }

        get(url: url, token: token) { data, response, error in
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 200
            if error == nil,
               statusCode < 300 {
                completion(nil)
            } else {
                completion(.general(error?.localizedDescription ?? "Unknown error"))
            }
        }
    }

    @available(*, deprecated, message: "Use async/await version instead")
    class func get(
        url: URL,
        token: String?,
        completion: @escaping (Data?, URLResponse?, Error?) -> Void
    ) {
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let token {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        URLSession.shared.dataTask(with: request, completionHandler: completion).resume()
    }

    @available(*, deprecated, message: "Use async/await version instead")
    class func post(
        url: URL,
        payload: Data,
        token: String?,
        completion: @escaping (Data?, URLResponse?, Error?) -> Void
    ) {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Accept")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = payload
        if let token {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        URLSession.shared.dataTask(with: request, completionHandler: completion).resume()
    }
}

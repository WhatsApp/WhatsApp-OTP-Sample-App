// Copyright (c) Meta Platforms, Inc. and its affiliates.
// This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.

import Foundation

class OtpRequestHelper {
    static func requestOtp(
        type: OtpType, // Only Copy Code is supported, 0/1 tap will be added later
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

    // MARK: - Network requests
    class func get(
        url: URL,
        token: String?,
        completion: @escaping (Data?, URLResponse?, Error?) -> Void
    ) {
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        // Sample server doesn't need a token as it runs locally
        if let token {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        URLSession.shared.dataTask(with: request, completionHandler: completion).resume()
    }

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

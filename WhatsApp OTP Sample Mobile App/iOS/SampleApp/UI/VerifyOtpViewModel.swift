/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Foundation

protocol VerifyOtpProtocol {
    func verifyCode(code: String, phoneNumber: String) async -> OtpVerificationError?
    @available(*, deprecated, message: "Use async/await version instead")
    func verifyCode(code: String, phoneNumber: String, completion: @escaping (OtpVerificationError?) -> Void)
}

extension VerifyOtpProtocol {
    func verifyCode(code: String, phoneNumber: String) async -> OtpVerificationError? {
        guard let url = OtpRequestUrl(phoneNumber: phoneNumber).url() else {
            return .urlInvalid
        }

        let model = OtpVerificationModel(code: code)
        guard let data = try? JSONEncoder().encode(model) else {
            return .general("Failed to encode verification model")
        }

        do {
            let (_, response) = try await OtpRequestHelper.post(url: url, payload: data, token: nil)
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 200
            if statusCode < 300 {
                return nil
            } else {
                if let verificationError = OtpVerificationError.error(from: statusCode) {
                    return verificationError
                } else {
                    return .general("Request failed with status code \(statusCode)")
                }
            }
        } catch {
            return .general(error.localizedDescription)
        }
    }

    @available(*, deprecated, message: "Use async/await version instead")
    func verifyCode(code: String, phoneNumber: String, completion: @escaping (OtpVerificationError?) -> Void) {
        guard let url = OtpRequestUrl(phoneNumber: phoneNumber).url() else {
            completion(.urlInvalid)
            return
        }

        let model = OtpVerificationModel(code: code)
        if let data = try? JSONEncoder().encode(model) {
            OtpRequestHelper.post(url: url, payload: data, token: nil) { data, response, error in
                let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 200
                if error == nil,
                   statusCode < 300 {
                    completion(nil)
                } else {
                    if let verificationError = OtpVerificationError.error(from: statusCode){
                        completion(verificationError)
                    } else {
                        completion(.general(error?.localizedDescription ?? "Unknown error"))
                    }
                }
            }
        } else {
            completion(.general("Fail to encode verification model"))
        }
    }
}

class VerifyOtpViewModel: VerifyOtpProtocol {
    let maxLengthOfOtp = 6
    var phoneNumber: PhoneNumber?
}

// Copyright (c) Meta Platforms, Inc. and its affiliates.
// This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.

import Foundation

protocol VerifyOtpProtocol {
    func verifyCode(code: String, phoneNumber: String, completion: @escaping (OtpVerificationError?) -> Void)
}

extension VerifyOtpProtocol {
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

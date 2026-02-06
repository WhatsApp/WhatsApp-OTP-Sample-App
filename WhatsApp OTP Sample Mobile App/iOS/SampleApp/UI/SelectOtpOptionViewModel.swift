/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Foundation

struct OtpOption {
    let title: String
    var phoneNumber: String
}

protocol RequestOtpProtocol {
    func requestOtp(to phoneNumber: String, completion: @escaping (OtpRequestError?) -> Void)
}

extension RequestOtpProtocol {
    func requestOtp(to phoneNumber: String, completion: @escaping (OtpRequestError?) -> Void) {
        OtpRequestHelper.requestOtp(
            type: .copyCode,
            to: phoneNumber,
            completion: completion
        )
    }
}

class SelectOtpOptionViewModel: RequestOtpProtocol {
    var phoneNumber: PhoneNumber
    var otpOptions: [OtpOption] = []

    init(phoneNumber: PhoneNumber) {
        self.phoneNumber = phoneNumber
        otpOptions = [
            OtpOption(title: "Send Code Via WhatsApp", phoneNumber: phoneNumber.formattedPhoneNumber),
            OtpOption(title: "Send Code Via SMS", phoneNumber: phoneNumber.formattedPhoneNumber),
        ]
    }
}

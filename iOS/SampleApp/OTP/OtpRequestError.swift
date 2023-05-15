// Copyright (c) Meta Platforms, Inc. and its affiliates.
// This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.

import Foundation

enum OtpRequestError: Error {
    case urlInvalid
    case tokenInvalid
    case businessPhoneNumberIdInvalid
    case templateNameInvalid
    case general(String)

    var description: String {
        switch self {
        case .urlInvalid:
            return "URL is invalid, please check."
        case .tokenInvalid:
            return "Token is invalid or missing, please check OtpRequestConfiguration."
        case .businessPhoneNumberIdInvalid:
            return "Business phone number ID is missing, please check OtpRequestConfiguration."
        case .templateNameInvalid:
            return "Template name is missing, please check OtpRequestConfiguration."
        case .general(let message):
            return message
        }
    }
}

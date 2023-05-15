// Copyright (c) Meta Platforms, Inc. and its affiliates.
// This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.

import Foundation

enum OtpVerificationError: Error {
    case noCodeProvided
    case codeExpiredOrIncorrect
    case noActiveCodeForPhoneNumber
    case urlInvalid
    case general(String)
}

extension OtpVerificationError {
    var code: Int? {
        switch self {
        case .noCodeProvided:
            return 400
        case .codeExpiredOrIncorrect:
            return 401
        case .noActiveCodeForPhoneNumber:
            return 404
        case .urlInvalid, .general(_):
            return nil
        }
    }

    var description: String {
        switch self {
        case .noCodeProvided:
            return "There is no OTP code attached on verification request."
        case .codeExpiredOrIncorrect:
            return "OTP code is either expired or incorrect."
        case .noActiveCodeForPhoneNumber:
            return "There is no active OTP code for this phone number."
        case .urlInvalid:
            return "URL is invalid, please check."
        case .general(let message):
            return message
        }
    }

    // Create error passing from Sample Server only
    static func error(from code: Int?) -> OtpVerificationError? {
        switch code {
        case OtpVerificationError.noCodeProvided.code:
            return .noCodeProvided
        case OtpVerificationError.codeExpiredOrIncorrect.code:
            return .codeExpiredOrIncorrect
        case OtpVerificationError.noActiveCodeForPhoneNumber.code:
            return .noActiveCodeForPhoneNumber
        default: return nil
        }
    }
}

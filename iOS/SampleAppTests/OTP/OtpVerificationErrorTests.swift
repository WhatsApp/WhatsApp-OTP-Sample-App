// Copyright (c) Meta Platforms, Inc. and its affiliates.
// This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.

@testable import SampleApp
import XCTest

final class OtpVerificationErrorTests: XCTestCase {
    func testCodeToError() throws {
        if case .noCodeProvided = OtpVerificationError.error(from: OtpVerificationError.noCodeProvided.code) {} else {
            XCTFail("fail to convert error code")
        }
        if case .codeExpiredOrIncorrect = OtpVerificationError.error(from: OtpVerificationError.codeExpiredOrIncorrect.code) {} else {
            XCTFail("fail to convert error code")
        }
        if case .noActiveCodeForPhoneNumber = OtpVerificationError.error(from: OtpVerificationError.noActiveCodeForPhoneNumber.code) {} else {
            XCTFail("fail to convert error code")
        }
        XCTAssertNil(
            OtpVerificationError.error(from: OtpVerificationError.urlInvalid.code)
        )
        XCTAssertNil(
            OtpVerificationError.error(from: OtpVerificationError.general("").code)
        )
    }
}

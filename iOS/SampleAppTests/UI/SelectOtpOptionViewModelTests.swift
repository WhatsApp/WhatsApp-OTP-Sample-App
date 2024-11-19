/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

@testable import SampleApp
import XCTest

class SelectOtpOptionViewModelTests: XCTestCase {
    func testCreateViewModel() throws {
        let phoneNumber = PhoneNumber(countryCode: "+1", phoneNumber: "2223334444")!
        let viewModel = SelectOtpOptionViewModel(phoneNumber: phoneNumber)

        XCTAssertEqual(viewModel.phoneNumber.formattedPhoneNumber, phoneNumber.formattedPhoneNumber)
        XCTAssertEqual(viewModel.otpOptions.count, 2)
        XCTAssertEqual(viewModel.otpOptions[0].phoneNumber, phoneNumber.formattedPhoneNumber)
        XCTAssertEqual(viewModel.otpOptions[1].phoneNumber, phoneNumber.formattedPhoneNumber)
    }

    func testRequestOtpProtocol() throws {
        struct Requester: RequestOtpProtocol {}
        let requester = Requester()
        let exp = expectation(description: "Loading")
        requester.requestOtp(to: "1234") { error in
            XCTAssertNotNil(error)
            exp.fulfill()
        }

        waitForExpectations(timeout: 3)
    }
}

/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

@testable import SampleApp
import XCTest

final class LoginViewModelTests: XCTestCase {
    let viewModel = LoginViewModel()

    func testVerifyPassword() throws {
        XCTAssertFalse(viewModel.verifyPassword(nil))
        XCTAssertFalse(viewModel.verifyPassword(""))
        XCTAssertTrue(viewModel.verifyPassword("abc"))
    }

    func testGetPhoneNumber() throws {
        // Nil cases
        var phoneNumber = viewModel.getPhoneNumber(countryCode: nil, phoneNumber: nil)
        XCTAssertNil(phoneNumber)
        phoneNumber = viewModel.getPhoneNumber(countryCode: nil, phoneNumber: "123")
        XCTAssertNil(phoneNumber)
        phoneNumber = viewModel.getPhoneNumber(countryCode: "+12", phoneNumber: nil)
        XCTAssertNil(phoneNumber)

        // Not Nil
        phoneNumber = viewModel.getPhoneNumber(countryCode: "+12", phoneNumber: "1234")
        XCTAssertNotNil(phoneNumber)
        XCTAssertEqual(phoneNumber?.countryCode, 12)
        XCTAssertEqual(phoneNumber?.phoneNumber, 1234)
        phoneNumber = viewModel.getPhoneNumber(countryCode: "+912", phoneNumber: " 12s#$#dfsdf3456")
        XCTAssertNotNil(phoneNumber)
        XCTAssertEqual(phoneNumber?.countryCode, 912)
        XCTAssertEqual(phoneNumber?.phoneNumber, 123456)
        phoneNumber = viewModel.getPhoneNumber(countryCode: "%1 ", phoneNumber: "-9 8745@#Q$62rtyr222=")
        XCTAssertNotNil(phoneNumber)
        XCTAssertEqual(phoneNumber?.countryCode, 1)
        XCTAssertEqual(phoneNumber?.phoneNumber, 9874562222)
    }
}

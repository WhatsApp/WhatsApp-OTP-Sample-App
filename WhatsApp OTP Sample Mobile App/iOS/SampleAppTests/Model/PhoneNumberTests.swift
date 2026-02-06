/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

@testable import SampleApp
import XCTest

final class PhoneNumberTests: XCTestCase {
    func testCreatePhoneNumber() throws {
        // Nil cases
        var phoneNumber = PhoneNumber(countryCode: "", phoneNumber: "")
        XCTAssertNil(phoneNumber)
        phoneNumber = PhoneNumber(countryCode: "", phoneNumber: "123")
        XCTAssertNil(phoneNumber)
        phoneNumber = PhoneNumber(countryCode: "+12", phoneNumber: "")
        XCTAssertNil(phoneNumber)

        // Not Nil
        phoneNumber = PhoneNumber(countryCode: "+12", phoneNumber: "1234")
        XCTAssertNotNil(phoneNumber)
        XCTAssertEqual(phoneNumber?.countryCode, 12)
        XCTAssertEqual(phoneNumber?.phoneNumber, 1234)
        XCTAssertEqual(phoneNumber?.formattedPhoneNumber, "+12 (123) 4")
        XCTAssertEqual(phoneNumber?.phoneNumberWithCountryCode, "121234")
        phoneNumber = PhoneNumber(countryCode: "+912", phoneNumber: " 12s#$#dfsdf3456")
        XCTAssertNotNil(phoneNumber)
        XCTAssertEqual(phoneNumber?.countryCode, 912)
        XCTAssertEqual(phoneNumber?.phoneNumber, 123456)
        XCTAssertEqual(phoneNumber?.formattedPhoneNumber, "+912 (123) 456")
        XCTAssertEqual(phoneNumber?.phoneNumberWithCountryCode, "912123456")
        phoneNumber = PhoneNumber(countryCode: "%1 ", phoneNumber: "-9 8745@#Q$62rtyr222=")
        XCTAssertNotNil(phoneNumber)
        XCTAssertEqual(phoneNumber?.countryCode, 1)
        XCTAssertEqual(phoneNumber?.phoneNumber, 9874562222)
        XCTAssertEqual(phoneNumber?.phoneNumberWithCountryCode, "19874562222")
        XCTAssertEqual(phoneNumber?.formattedPhoneNumber, "+1 (987) 456-2222")
    }
}

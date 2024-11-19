/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

@testable import SampleApp
import XCTest

final class StringExtensionTests: XCTestCase {
    func testApplyPatternOnNumbers() throws {
        // Success case 1 digit country code
        XCTAssertEqual(
            "+1 (234) 567-7890",
            PhoneNumber(countryCode: "+1", phoneNumber: "2345677890")?.formattedPhoneNumber
        )
        // Success case 2 digit country code
        XCTAssertEqual(
            "+91 (234) 567-7890",
            PhoneNumber(countryCode: "+91", phoneNumber: "2345677890")?.formattedPhoneNumber
        )
        // Success case 3 digit country code
        XCTAssertEqual(
            "+759 (234) 567-7890",
            PhoneNumber(countryCode: "+759", phoneNumber: "2345677890")?.formattedPhoneNumber
        )
        // Phone Number is not pure number case
        XCTAssertEqual(
            "+759 (234) 567-7890",
            PhoneNumber(countryCode: "+759sdf", phoneNumber: "2345677890")?.formattedPhoneNumber
        )
        // Phone Number is shorter than 10 digits case
        XCTAssertEqual(
            "+1 (234) 567-7",
            PhoneNumber(countryCode: "+1", phoneNumber: "2345677")?.formattedPhoneNumber
        )
        // Phone Number is longer than 10 digits case
        XCTAssertEqual(
            "+1 (234) 567-7890123123",
            PhoneNumber(countryCode: "+1", phoneNumber: "2345677890123123")?.formattedPhoneNumber
        )
    }

    func testGetPureNumber() throws {
        XCTAssertEqual(
            2345677890,
            "(234) 567-7890".getPureNumber()
        )
        XCTAssertEqual(
            2345677890999999999,
            "(0234) 567-7890999999999".getPureNumber()
        )
        XCTAssertEqual(
            2345677890999999999,
            "  /d(@$##@#$0234) *)hshkjhfkdshfaiushfdsaklg sdfds   sf s567-7890999999999".getPureNumber()
        )
    }
}

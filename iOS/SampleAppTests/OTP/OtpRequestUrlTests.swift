// Copyright (c) Meta Platforms, Inc. and its affiliates.
// This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.

@testable import SampleApp
import XCTest

final class OtpRequestUrlTests: XCTestCase {
    func testCreateUrl() throws {
        let phone = "123456"
        let url = OtpRequestUrl(phoneNumber: phone)
        XCTAssertEqual(
            url.phoneNumber,
            phone
        )
    }

    func testGetUrlSuccess() throws {
        let url = OtpRequestUrl(phoneNumber: "123456")
        XCTAssertEqual(
            url.url()?.absoluteString,
            "\(url.host):\(url.port)\(url.path)/\(url.phoneNumber)"
        )
    }

    func testGetUrlFailed() throws {
        let url = OtpRequestUrl(phoneNumber: " ")
        XCTAssertNil(url.url())
    }
}

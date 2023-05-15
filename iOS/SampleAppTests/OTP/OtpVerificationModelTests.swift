// Copyright (c) Meta Platforms, Inc. and its affiliates.
// This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.

@testable import SampleApp
import XCTest

final class OtpVerificationModelTests: XCTestCase {
    func testEncodable() throws {
        // GIVEN
        let code = "123654"
        let model = OtpVerificationModel(code: code)

        // WHEN encode
        let encoding = try? JSONEncoder().encode(model)

        // THEN
        XCTAssertNotNil(encoding)
        XCTAssertTrue(String(data: encoding!, encoding: .utf8)?.contains(code) == true)
    }
}

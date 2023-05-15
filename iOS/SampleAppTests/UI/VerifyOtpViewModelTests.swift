// Copyright (c) Meta Platforms, Inc. and its affiliates.
// This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.

@testable import SampleApp
import XCTest

class VerifyOtpViewModelTests: XCTestCase {
    func testVerifyCode() throws {
        struct vop: VerifyOtpProtocol {}
        // WHEN phone number invalid
        vop().verifyCode(code: "12345", phoneNumber: "789123 #$ -+_456789") { error in
            switch error {
            case .urlInvalid: break
            default: XCTFail("Error Not Match")
            }
        }

        // WHEN sample server is not available (unable to setup sampler server for unit test)
        vop().verifyCode(code: "12345", phoneNumber: "789123456789") { error in
            switch error {
            case .general(let message): XCTAssertEqual(message, "Could not connect to the server.")
            default: XCTFail("Error not matched")
            }
        }
    }
}

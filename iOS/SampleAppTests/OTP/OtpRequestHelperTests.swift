// Copyright (c) Meta Platforms, Inc. and its affiliates.
// This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.

import Mockingbird
@testable import SampleApp
import XCTest

class OtpRequestHelperTests: XCTestCase {
    let helper = type(of: mock(OtpRequestHelper.self))

    override func setUpWithError() throws {
        reset(helper)
    }

    func testRequestOtpOnInvalidPhoneNumber() throws {
        OtpRequestHelper.requestOtp(type: .copyCode, to: "123 abc") { error in
            switch error {
            case .urlInvalid: break
            default: XCTFail("Error not match")
            }
        }
    }

    func testRequestOtpOnSuccess() throws {
        let phoneNumber = "911312124543565"
        // GIVEN response code = 200
        given(helper.get(
            url: any(),
            token: any(),
            completion: any()
        ))
        .will { url, token, completion in
            XCTAssertEqual(OtpRequestUrl(phoneNumber: phoneNumber).url(), url)
            XCTAssertNil(token)
            completion(
                nil,
                HTTPURLResponse(url: url, statusCode: 200, httpVersion: nil, headerFields: nil),
                nil
            )
        }
        // WHEN calling requestOtp
        helper.requestOtp(type: .copyCode, to: phoneNumber) { error in
            // THEN verify error is nil
            XCTAssertNil(error)
        }
    }

    func testRequestOtpOnError() throws {
        let phoneNumber = "1234234523456"
        let responseError = NSError(domain: "test", code: 1234)
        let tokenPassed = "SDF&*^^%^&*#Y(*GHUIGJG"

        // GIVEN token is not nil
        given(helper.get(
            url: any(),
            token: any(),
            completion: any()
        ))
        .will { url, token, completion in
            XCTAssertEqual(OtpRequestUrl(phoneNumber: phoneNumber).url(), url)
            XCTAssertEqual(token, tokenPassed)
            completion(nil, nil, responseError)
        }
        // WHEN calling requestOtp
        helper.requestOtp(type: .copyCode, to: phoneNumber, token: tokenPassed) { error in
            // THEN verify error is general and message is unknown
            switch error {
            case .general(let message): XCTAssertEqual(message, responseError.localizedDescription)
            default: XCTFail("Error not matched")
            }
        }

        // Clearing for following test
        clearInvocations(on: helper)
        reset(helper)

        // GIVEN token is nil
        given(helper.get(
            url: any(),
            token: any(),
            completion: any()
        ))
        .will { url, token, completion in
            XCTAssertEqual(OtpRequestUrl(phoneNumber: phoneNumber).url(), url)
            XCTAssertNil(token)
            completion(nil, nil, responseError)
        }
        // WHEN calling requestOtp
        helper.requestOtp(type: .copyCode, to: phoneNumber) { error in
            // THEN verify error is general and message is unknown
            switch error {
            case .general(let message): XCTAssertEqual(message, responseError.localizedDescription)
            default: XCTFail("Error not matched")
            }
        }

        // Clearing for following test
        clearInvocations(on: helper)
        reset(helper)

        // GIVEN response code = 400 and error is nil
        given(helper.get(
            url: any(),
            token: any(),
            completion: any()
        ))
        .will { url, token, completion in
            XCTAssertEqual(OtpRequestUrl(phoneNumber: phoneNumber).url(), url)
            XCTAssertNil(token)
            completion(
                nil,
                HTTPURLResponse(url: url, statusCode: 400, httpVersion: nil, headerFields: nil),
                nil
            )
        }
        // WHEN calling requestOtp
        helper.requestOtp(type: .copyCode, to: phoneNumber) { error in
            // THEN verify error is general and message is unknown
            switch error {
            case .general(let message): XCTAssertEqual(message, "Unknown error")
            default: XCTFail("Error not matched")
            }
        }
    }

}

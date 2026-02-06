/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

@testable import SampleApp
import Mockingbird
import XCTest

final class UIViewControllerExtensionTests: XCTestCase {
    func testShowAlert() throws {
        let vc = mock(UIViewController.self)
        let message = "test"
        // GIVEN presentedViewController is nil
        given(vc.present(firstArg(any()), animated: secondArg(any()))).will { (alert: UIAlertController) in
            XCTAssertEqual(alert.message, message)
        }
        given(vc.presentedViewController).willReturn(nil)
        // WHEN
        vc.showAlert(message: message)
        // THEN
        verify(vc.present(firstArg(any()), animated: secondArg(any()))).wasCalled()

        // GIVEN presentedViewController is not nil
        clearInvocations(on: vc)
        let presentedVc = mock(UIViewController.self)
        given(vc.presentedViewController).willReturn(presentedVc)
        // WHEN
        vc.showAlert(message: message)
        // THEN
        verify(vc.present(firstArg(any()), animated: secondArg(any()))).wasCalled()
        verify(presentedVc.dismiss(animated: firstArg(any()))).wasCalled()
    }
}

/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import UIKit

class LoginViewModel {
    // MARK: - Password validation
    func verifyPassword(_ password: String?) -> Bool {
        guard password != nil, !password!.isEmpty else {
            return false
        }

        // Add your logic to verify password
        return true
    }

    // MARK: - Phone number validation
    func getPhoneNumber(countryCode: String?, phoneNumber: String?) -> PhoneNumber? {
        guard let countryCode,
              let phoneNumber else {
            return nil
        }

        return PhoneNumber(countryCode: countryCode, phoneNumber: phoneNumber)
    }
}

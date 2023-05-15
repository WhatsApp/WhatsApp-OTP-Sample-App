// Copyright (c) Meta Platforms, Inc. and its affiliates.
// This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.

import Foundation

struct PhoneNumber {
    static let countryCodePattern = "+#"
    static let phoneNumberPattern = "(###) ###-####"
    let countryCode: Int
    let phoneNumber: Int

    init?(countryCode: String, phoneNumber: String) {
        guard let countryCode = countryCode.getPureNumber(),
              let phoneNumber = phoneNumber.getPureNumber() else {
            return nil
        }

        self.countryCode = countryCode
        self.phoneNumber = phoneNumber
    }


    /// Show formatted number i.e. +1 (234) 567-8909
    var formattedPhoneNumber: String {
        return countryCode.description.applyPatternOnNumbers(
            pattern: PhoneNumber.countryCodePattern,
            replacementCharacter: "#"
        ) + " " + phoneNumber.description.applyPatternOnNumbers(
            pattern: PhoneNumber.phoneNumberPattern,
            replacementCharacter: "#"
        )
    }

    /// Phone number format passed to WhatsApp
    var phoneNumberWithCountryCode: String {
        return countryCode.description + phoneNumber.description
    }
}

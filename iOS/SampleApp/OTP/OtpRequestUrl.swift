/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Foundation

struct OtpRequestUrl {
    // This is for sample server running locally in your machine
    // Please do configure this for your own server
    let host = "http://127.0.0.1"
    let port = "3000"
    let path = "/OTP"
    let phoneNumber: String

    func url() -> URL? {
        if #available(iOS 17, *) {
            return URL(string: "\(host):\(port)\(path)/\(phoneNumber)", encodingInvalidCharacters: false)
        } else {
            return URL(string: "\(host):\(port)\(path)/\(phoneNumber)")
        }
    }
}

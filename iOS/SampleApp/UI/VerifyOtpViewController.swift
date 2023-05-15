/// Copyright (c) Meta Platforms, Inc. and its affiliates.
// This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.

import UIKit

class VerifyOtpViewController: UIViewController, UITextFieldDelegate {
    @IBOutlet weak var oneTimePasscodeTextField: UITextField!

    private let viewModel = VerifyOtpViewModel()

    override func viewDidLoad() {
        super.viewDidLoad()

        oneTimePasscodeTextField.delegate = self
    }

    /// Call this to autofill OTP when receving response from WA client
    /// - Parameter code: the otp code received from WA client
    func setResponedOtpCode(_ code: String) {
        oneTimePasscodeTextField.text = code
    }

    func setPhoneNumber(_ phoneNumber: PhoneNumber) {
        viewModel.phoneNumber = phoneNumber
    }

    @IBAction func submitCode(_ sender: Any) {
        guard let code = oneTimePasscodeTextField.text,
        !code.isEmpty else {
            showAlert(message: "Code cannot be empty.")
            return
        }
        guard let phoneNumber = viewModel.phoneNumber else {
            showAlert(message: "Phone number cannot be empty.")
            return
        }

        viewModel.verifyCode(code: code, phoneNumber: phoneNumber.phoneNumberWithCountryCode) { error in
            DispatchQueue.main.async {
                if let error {
                    self.showAlert(message: error.description)
                } else {
                    self.showAlert(message: "Verified!")
                }
            }
        }
    }

    // MARK: - UITextFieldDelegate
    func textField(_ textField: UITextField, shouldChangeCharactersIn range: NSRange, replacementString string: String) -> Bool {
        return range.location < viewModel.maxLengthOfOtp
    }
}

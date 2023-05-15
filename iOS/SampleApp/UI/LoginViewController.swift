// Copyright (c) Meta Platforms, Inc. and its affiliates.
// This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.

import UIKit

class LoginViewController: UIViewController, UITextFieldDelegate {
    // MARK: - UI
    @IBOutlet weak var countryCodeTextField: UITextField!
    @IBOutlet weak var phoneNumberTextField: UITextField!
    @IBOutlet weak var passwordTextField: UITextField!
    @IBOutlet weak var loginButton: UIButton!

    // MARK: - variables
    private let viewModel = LoginViewModel()

    // MARK: - view controller
    override func viewDidLoad() {
        super.viewDidLoad()

        setLoginButton(enabled: false)
        countryCodeTextField.delegate = self
        phoneNumberTextField.delegate = self
        passwordTextField.delegate = self
    }

    // MARK: - buttons
    @IBAction func loginAction(_ sender: Any) {
        guard let phoneNumber = viewModel.getPhoneNumber(
            countryCode: countryCodeTextField.text,
            phoneNumber: phoneNumberTextField.text
        ) else {
            showAlert(message: "Phone number is invalid.")
            return
        }
        guard viewModel.verifyPassword(passwordTextField.text) else {
            showAlert(message: "Password is invalid.")
            return
        }

        let vc = UIStoryboard(name: "Main", bundle: nil).instantiateViewController(
            withIdentifier: String(describing: SelectOtpOptionViewController.self)
        ) as! SelectOtpOptionViewController
        vc.setPhoneNumber(phoneNumber)
        self.navigationController?.pushViewController(vc, animated: true)
    }

    private func setLoginButton(enabled: Bool) {
        if enabled {
            loginButton.isEnabled = true
            loginButton.backgroundColor = .systemBlue
        } else {
            loginButton.isEnabled = false
            loginButton.backgroundColor = .lightGray

        }
    }

    // MARK: - Text Field delegate
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        loginAction(loginButton!)
        return true
    }

    func textField(_ textField: UITextField, shouldChangeCharactersIn range: NSRange, replacementString string: String) -> Bool {
        if viewModel.getPhoneNumber(
            countryCode: countryCodeTextField.text,
            phoneNumber: phoneNumberTextField.text) != nil &&
            viewModel.verifyPassword(passwordTextField.text) {
            setLoginButton(enabled: true)
        }

        if textField == countryCodeTextField && range.location == 0 {
            return false
        } else if textField == phoneNumberTextField {
            textField.text = textField.text?.applyPatternOnNumbers(
                pattern: PhoneNumber.phoneNumberPattern,
                replacementCharacter: "#"
            )
        }

        return true
    }
}

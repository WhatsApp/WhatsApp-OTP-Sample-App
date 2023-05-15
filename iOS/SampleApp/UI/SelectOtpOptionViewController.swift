// Copyright (c) Meta Platforms, Inc. and its affiliates.
// This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.

import UIKit

class SelectOtpOptionViewController: UIViewController, UITableViewDataSource, UITableViewDelegate {
    @IBOutlet weak var tableView: UITableView!
    private let cellIdentifier = "otpSenderCell"
    private var viewModel: SelectOtpOptionViewModel?
    private let unselectedImage = UIImage.init(systemName: "circle")
    private let selectedImage = UIImage.init(systemName: "checkmark.circle.fill")

    @IBAction func continueAction(_ sender: Any) {
        requestOtpAndShowVerificationView()
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        tableView.dataSource = self
        tableView.delegate = self
        tableView.selectRow(at: IndexPath(row: 0, section: 0), animated: false, scrollPosition: .none)
    }

    func setPhoneNumber(_ phoneNumber: PhoneNumber) {
        viewModel = SelectOtpOptionViewModel(phoneNumber: phoneNumber)
    }

    func requestOtpAndShowVerificationView() {
        if tableView.indexPathForSelectedRow == IndexPath(row: 0, section: 0),
           let viewModel {
            viewModel.requestOtp(to: viewModel.phoneNumber.phoneNumberWithCountryCode) { error in
                DispatchQueue.main.async {
                    if let error {
                        self.showAlert(message: error.description)
                    } else {
                        let vc = UIStoryboard(name: "Main", bundle: nil).instantiateViewController(
                            withIdentifier: String(describing: VerifyOtpViewController.self)
                        ) as! VerifyOtpViewController
                        vc.setPhoneNumber(viewModel.phoneNumber)
                        self.present(vc, animated: true)
                    }
                }
            }
        } else {
            showAlert(message: "Please add your own implementation")
        }
    }

    func getVerificationViewController() -> VerifyOtpViewController {
        return UIStoryboard(name: "Main", bundle: nil).instantiateViewController(
            withIdentifier: String(describing: VerifyOtpViewController.self)
        ) as! VerifyOtpViewController
    }

    // MARK: - Table View Data Source
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return viewModel?.otpOptions.count ?? 0
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: cellIdentifier, for: indexPath)
        let otpOption = viewModel!.otpOptions[indexPath.row]

        cell.textLabel?.text = otpOption.title
        cell.detailTextLabel?.text = otpOption.phoneNumber
        cell.imageView?.image = tableView.indexPathForSelectedRow == indexPath ? selectedImage : unselectedImage

        return cell
    }

    // MARK: - Table View Delegate
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let cell = tableView.cellForRow(at: indexPath)
        cell?.imageView?.image = selectedImage
    }

    func tableView(_ tableView: UITableView, didDeselectRowAt indexPath: IndexPath) {
        let cell = tableView.cellForRow(at: indexPath)
        cell?.imageView?.image = unselectedImage
    }
}

// Copyright (c) Meta Platforms, Inc. and its affiliates.
// This source code is licensed under the MIT license found in the LICENSE file in the root directory of this source tree.

import UIKit

extension UIViewController {
    func showAlert(message: String) {
        let alertController = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alertController.addAction(UIAlertAction(title: "OK", style: .cancel))

        if let vc = self.presentedViewController{
            vc.dismiss(animated: false)
        }

        self.present(alertController, animated: true)
    }
}

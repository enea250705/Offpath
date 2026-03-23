//
//  Item.swift
//  Offpath
//
//  Created by Enea Muja on March 22, 2026.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date

    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}

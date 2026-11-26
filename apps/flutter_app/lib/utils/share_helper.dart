import 'dart:math';
import '../models/listing.dart';

String naijaShareText(Listing listing) {
  final price = listing.price.toStringAsFixed(0);
  final messages = [
    'Abeg check dis property wey I see for UnaDomot o! ${listing.title} - ₦$price/month. No agent wahala! 🇳🇬',
    'Omo! See where to spend your money! ${listing.title} just Dey your domot! 😱',
    'If you get money like this, come see: ${listing.title} for ₦$price/month. No dulling! 💰',
    'If you no share this, I go vex! ${listing.title} - ₦$price/month. Abeg help me share! 😤',
    'You wey get money like water! Come buy this one: ${listing.title} for ₦$price/month. Sharp sharp! 💸',
    'Just dey show you wetin I dey look... ${listing.title} - ₦$price/month. No too talk abeg 🤫',
    'As e dey hot so, I don see better place: ${listing.title}. ₦$price/month. Who get money come! 🔥',
    '🚨 URGENT: Dis property no fit last! ${listing.title} - ₦$price/month. Grab am quick! 🏃',
  ];
  return messages[Random().nextInt(messages.length)];
}

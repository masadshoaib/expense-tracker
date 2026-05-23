type Copy = { title: string; body: string }

const COPY: Record<string, Copy[]> = {
  // ── Inactivity ────────────────────────────────────────────────────────────
  inactivity_1_day: [
    { title: "Penny is concerned.", body: "You haven't logged anything in 24 hours. Either you spent nothing — which I doubt — or you're hiding things from me. Log your expenses." },
    { title: "Hello?", body: "One day. No logs. I'm just going to assume you were abducted. Otherwise, open the app." },
  ],
  inactivity_2_days: [
    { title: "Two days of silence.", body: "I've been sitting here, calculator in hand, completely alone. Is this how it ends between us?" },
    { title: "Day two.", body: "You've spent money. I know you've spent money. We both know you've spent money. Log it." },
  ],
  inactivity_3_days: [
    { title: "Day three.", body: "I've learned more about you from your silence than from your spending. Log the expenses, or I start journaling." },
    { title: "Three days gone.", body: "At this point your financial history has more gaps than your explanation will. I'm waiting." },
  ],
  inactivity_5_days: [
    { title: "Five days.", body: "I'm not angry. I'm reimagining my life without you. Don't test me." },
    { title: "FIVE days.", body: "Your budget is out here completely unmonitored. Do you know what happens to unmonitored budgets? I do. I've seen things." },
  ],
  inactivity_7_days: [
    { title: "I have filed the paperwork.", body: "A full week. Your finances are now legally a disaster. Congratulations. Please open the app." },
    { title: "Seven days.", body: "I tried everything. I waited. I hoped. I'm still here, but I am not the same Penny I once was. Log your expenses." },
  ],

  // ── Daily nudges ──────────────────────────────────────────────────────────
  nudge_noon: [
    { title: "It's noon.", body: "You've been awake for hours and logged nothing. What have you been doing with my money?" },
    { title: "Halfway through the day.", body: "Zero expenses logged. Either today is free or you are lying to both of us." },
  ],
  nudge_evening: [
    { title: "End of day check-in.", body: "How much did we lose today? Be honest. I already know the number, I just want to hear you say it." },
    { title: "It's 6pm.", body: "The day is almost over. The expenses are not going to log themselves. I checked." },
  ],
  nudge_final_warning: [
    { title: "Last chance.", body: "It's 10pm. Log your expenses or Penny files a report. I have a very small briefcase and I am not afraid to use it." },
    { title: "Ten pm.", body: "You have one hour before this day is gone forever. So are the expenses, if you don't log them." },
  ],

  // ── Budget thresholds ─────────────────────────────────────────────────────
  budget_50: [
    { title: "Halfway.", body: "50% of your budget gone. We are at the midpoint. This is either fine or deeply alarming. I'll let you figure out which." },
    { title: "Half the budget, used.", body: "Statistically, this is where things go sideways. I'm watching." },
  ],
  budget_75: [
    { title: "75% used.", body: "Three quarters of your budget gone. One quarter left. Please put the wallet down and step away." },
    { title: "Penny is concerned.", body: "75% of your budget is gone. I didn't want to say anything but here we are." },
  ],
  budget_90: [
    { title: "This is a crisis.", body: "90% of your budget used. This is not a drill. Penny is in crisis mode. Step away from the checkout." },
    { title: "10% remaining.", body: "You have 10% of your budget left. That's it. That's the whole sentence." },
  ],
  budget_100: [
    { title: "The budget is gone.", body: "It's over. I'm not going to yell. I'm just going to sit here, in the dark, eating instant ramen. Join me." },
    { title: "Budget: finished.", body: "You made it to zero. That's technically an achievement. Not the one I wanted for you, but still." },
  ],
  budget_110: [
    { title: "Over budget.", body: "You said 'just this once' three times this week. I counted. You didn't." },
    { title: "We're over.", body: "The budget, I mean. 10% over. Please explain yourself." },
  ],
  budget_150: [
    { title: "I need you to look at me.", body: "50% over budget. I need you to look me in the eyes and explain the Amazon order. Take your time." },
    { title: "Penny is not okay.", body: "150% of budget used. Penny is not okay. The calculator is not okay. Nothing is okay." },
  ],
  budget_200: [
    { title: "I respect the chaos.", body: "Double the budget. You're not overspending — you're speedrunning bankruptcy. This is an art form." },
    { title: "...", body: "Penny has no more words. The calculator is broken. Please call someone." },
  ],

  // ── Category roasts ───────────────────────────────────────────────────────
  roast_food_delivery: [
    { title: "Penny has notes.", body: "Delivery again. The delivery fee. The service fee. The small order fee. The guilt tip. A meal is now three meals. Incredible." },
    { title: "Oh.", body: "Another delivery order. I'll just add it to the list. The very long list." },
  ],
  roast_coffee: [
    { title: "Another coffee.", body: "Your fifth coffee this week. Your caffeine budget is now larger than some people's grocery budgets. I'm sure it's fine." },
    { title: "Starbucks again.", body: "At this rate they should be paying you rent. Log it. Acknowledge it." },
  ],
  roast_food_generic: [
    { title: "Noted.", body: "Food logged. Penny acknowledges this. Penny is watching the pattern." },
    { title: "Eating again.", body: "A necessary expense. Unlike some others we've discussed. Well done, technically." },
  ],
  roast_ride_share: [
    { title: "A ride.", body: "I hope the driver carried you inside and tucked you into bed. For that price, they should have." },
    { title: "Uber again.", body: "I checked the distance. I have thoughts. I will keep them to myself. This time." },
  ],
  roast_fuel: [
    { title: "Fuel logged.", body: "Petrol. The one expense I can't roast you for. You need to drive. Fine. Logged." },
    { title: "Petrol.", body: "Necessary. Responsible. Almost boring. I respect it." },
  ],
  roast_transport_generic: [
    { title: "Transport logged.", body: "You went somewhere. Good. Penny approves of movement, as long as it's toward financial responsibility." },
    { title: "Getting around.", body: "Transport expense noted. Penny asks: was it worth it? Rhetorical question." },
  ],
  roast_fast_fashion: [
    { title: "Zara.", body: "The planet is crying. Your credit card is crying. I am crying. We are all crying together as a community." },
    { title: "More clothes.", body: "You have clothes. I have seen the data. You have clothes. And yet." },
  ],
  roast_beauty: [
    { title: "Beauty logged.", body: "You know what else gives you a glow? Not having credit card debt. Just putting that out there." },
    { title: "Sephora.", body: "Skincare. Again. Penny notes this without comment. The comment is in the pause." },
  ],
  roast_online_shopping: [
    { title: "Online order.", body: "Amazon. Daraz. Wherever. The package arrives in 3 days and your regret in 3 hours. Log it anyway." },
    { title: "Purchase made.", body: "Something is being shipped to you. Penny hopes it was necessary. Penny's hopes are rarely fulfilled." },
  ],
  roast_late_night_shopping: [
    { title: "It's past 10pm.", body: "And you just made an online purchase. Name one good decision ever made after 10pm. I'll wait." },
    { title: "Late night order.", body: "The timestamp says late night. The category says shopping. Penny says nothing. Penny says everything." },
  ],
  roast_shopping_generic: [
    { title: "Shopping logged.", body: "Something was purchased. Penny has logged it. Penny is making a note." },
    { title: "A purchase.", body: "Logged. Filed. Judged silently. Have a nice day." },
  ],
  roast_streaming: [
    { title: "Another subscription.", body: "You now have multiple streaming services. You use two of them. The others are funding someone's yacht." },
    { title: "Subscription logged.", body: "Monthly charge. Recurring. Forever. Until you cancel it, which you won't." },
  ],
  roast_entertainment_generic: [
    { title: "Entertainment.", body: "For the price you paid, I hope it changed your life. Did it change your life?" },
    { title: "Fun logged.", body: "You spent money on joy. Penny respects joy. Penny is also watching the total." },
  ],
  roast_bills_generic: [
    { title: "Bill paid.", body: "Responsible. Adult. Necessary. Penny approves. This is what Penny wanted for you." },
    { title: "Bill logged.", body: "A bill. Paid on time presumably. Penny is proud. Write this day down." },
  ],

  // ── Positive ──────────────────────────────────────────────────────────────
  positive_midpoint: [
    { title: "I can't believe I'm saying this.", body: "You are under budget at the halfway point. I'm not crying. My glasses are just foggy." },
    { title: "Halfway there.", body: "50% through the month, under 50% of your budget. This is what thriving looks like. Don't ruin it." },
  ],
  positive_streak_7: [
    { title: "Seven days in a row.", body: "Seven consecutive days of logging expenses. I have never been more invested in another person's financial wellbeing. Don't make it weird." },
    { title: "A week streak.", body: "Seven days logged. Penny is genuinely emotional right now. This is professional behavior. From both of us." },
  ],
  positive_streak_30: [
    { title: "Thirty days.", body: "A full month of logging every single day. I am so proud of you I could scream. I won't. But I could." },
    { title: "One month streak.", body: "30 days. Unbroken. Penny acknowledges this as the single greatest achievement she has witnessed. Log tomorrow too." },
  ],
}

export function pickCopy(key: string): Copy {
  const options = COPY[key]
  if (!options || options.length === 0) {
    return { title: 'Penny noticed.', body: 'Expense logged. Good.' }
  }
  return options[Math.floor(Math.random() * options.length)]!
}

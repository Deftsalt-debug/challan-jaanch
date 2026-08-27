import type { Bilingual } from './i18n.ts';
import { bi } from './i18n.ts';
import type { Outcome } from './cases.ts';

/**
 * What a citizen can actually do next.
 *
 * Finding a contradiction is only half the journey. The harder half is that a
 * disputed challan can sit with the issuing authority, with a virtual court, or
 * in a settlement forum, and each of those is a different destination with a
 * different action — which is exactly the kind of thing a public-service website
 * expects you to already know.
 *
 * This module names those destinations and orders them. It deliberately does not
 * claim to know where a particular challan currently sits, how long a transfer
 * takes, or what any forum will decide. Those vary by state and by the age of the
 * record, and the app has no authorised way to read a real challan's status.
 * Saying so plainly is more useful than a confident guess.
 */

export type RouteStatus = 'act-now' | 'closing' | 'later' | 'alternative';

export interface NextRoute {
  id: string;
  status: RouteStatus;
  /** Government destination. Only official, hard-coded hosts appear here. */
  url: string;
  authority: Bilingual;
  title: Bilingual;
  /** What this route actually is, in plain words. */
  what: Bilingual;
  /** When it applies, stated without inventing a timeline. */
  when: Bilingual;
  /** A secondary official link, where one genuinely exists. */
  secondary?: { url: string; label: Bilingual };
}

export interface RoutePlan {
  lead: Bilingual;
  caution: Bilingual;
  routes: NextRoute[];
}

export const GRIEVANCE_URL = 'https://echallan.parivahan.gov.in/';
export const GRIEVANCE_STATUS_URL = 'https://echallan.parivahan.gov.in/gsticket/';
export const VIRTUAL_COURT_URL = 'https://vcourts.gov.in/virtualcourt/';
export const LOK_ADALAT_URL = 'https://nalsa.gov.in/regular-lok-adalat/';

/** Mirrors the `status` field of `deadlineFor()`. */
export type ClockStatus = 'open' | 'today' | 'passed';

/**
 * Builds the route plan.
 *
 * `outcome` changes only the framing, never the destinations: a citizen with no
 * supported finding still has every one of these routes available for grounds
 * this tool cannot see, and it would be wrong to hide them. What changes is
 * whether the app implies it has given them something to attach.
 */
export function nextRoutes(outcome: Outcome, deadline: { status: ClockStatus; daysLeft: number } | null): RoutePlan {
  const supported = outcome === 'supported';
  // A deadline that could not be calculated is treated as urgent rather than
  // relaxed: not knowing how long is left is a reason to check sooner.
  const urgent = !deadline || deadline.status !== 'open' || deadline.daysLeft <= 7;

  const lead = supported
    ? bi(
      'You have a packet describing a contradiction in the supplied records. Nothing has been submitted anywhere. These are the official places a challan can be taken up, and you open each of them yourself.',
      'आपके पास एक पैकेट है जो दिए गए रिकॉर्ड में विरोधाभास बताता है। कहीं कुछ जमा नहीं किया गया है। नीचे वे आधिकारिक जगहें हैं जहाँ चालान उठाया जा सकता है, और उनमें से हर एक आप ख़ुद खोलते हैं।',
    )
    : bi(
      'This tool found no supported contradiction, which is not the same as the challan being correct. You may still have grounds it cannot see, such as being elsewhere at the time. These are the official routes either way.',
      'इस टूल को कोई प्रमाणित विरोधाभास नहीं मिला — इसका मतलब यह नहीं कि चालान सही है। आपके पास ऐसे आधार हो सकते हैं जो यह टूल नहीं देख सकता, जैसे उस समय आपका कहीं और होना। दोनों ही स्थितियों में आधिकारिक रास्ते ये हैं।',
    );

  const caution = bi(
    'Which forum currently holds a challan, and how long it stays there, differs by state and by the age of the record. Challan Jaanch cannot read your challan’s live status, so confirm the current position on the official service before relying on any step below.',
    'कोई चालान इस समय किस मंच के पास है और वहाँ कितने समय रहता है, यह राज्य और रिकॉर्ड की पुरानी होने पर निर्भर करता है। चालान जाँच आपके चालान की मौजूदा स्थिति नहीं पढ़ सकता, इसलिए नीचे किसी भी क़दम पर भरोसा करने से पहले आधिकारिक सेवा पर स्थिति ज़रूर देखें।',
  );

  const routes: NextRoute[] = [
    {
      id: 'grievance',
      status: urgent ? 'act-now' : 'closing',
      url: GRIEVANCE_URL,
      authority: bi('Ministry of Road Transport and Highways', 'सड़क परिवहन और राजमार्ग मंत्रालय'),
      title: bi('Open eChallan and choose Grievance', 'ई-चालान खोलें और Grievance चुनें'),
      what: bi(
        'The national eChallan service exposes its grievance flow from the official portal. Open the service independently, choose Grievance, and follow the current instructions shown there.',
        'राष्ट्रीय ई-चालान सेवा अपने आधिकारिक पोर्टल से शिकायत का रास्ता देती है। सेवा अलग से खोलें, Grievance चुनें और वहाँ दिख रहे मौजूदा निर्देश मानें।',
      ),
      when: bi(
        'The earliest route, and the one your evidence packet is written for. Raise it while the record is still with the issuing authority rather than after it moves on.',
        'यह सबसे पहला रास्ता है और आपका साक्ष्य पैकेट इसी के लिए बना है। रिकॉर्ड जब तक जारी करने वाले विभाग के पास है, तभी शिकायत करें — आगे बढ़ जाने के बाद नहीं।',
      ),
      secondary: {
        url: GRIEVANCE_STATUS_URL,
        label: bi('Track a grievance ticket you already have', 'पहले से मौजूद शिकायत टिकट की स्थिति देखें'),
      },
    },
    {
      id: 'virtual-court',
      status: 'later',
      url: VIRTUAL_COURT_URL,
      authority: bi('eCourts, Department of Justice', 'ई-कोर्ट्स, न्याय विभाग'),
      title: bi('Look the challan up in the Virtual Court', 'वर्चुअल कोर्ट में चालान देखें'),
      what: bi(
        'When a challan appears in Virtual Court, its current service lets you pay the stated fine or choose “Request to Contest.” After verification, a contest request produces an acknowledgement with the assigned physical court and date.',
        'जब कोई चालान वर्चुअल कोर्ट में दिखता है, तो उसकी मौजूदा सेवा पर आप बताई गई राशि भर सकते हैं या “Request to Contest” चुन सकते हैं। पुष्टि के बाद contest request की रसीद में तय भौतिक अदालत और तारीख़ मिलती है।',
      ),
      when: bi(
        'Only once your challan actually appears there. Search by challan or vehicle number to find out; do not assume it has moved.',
        'तभी, जब आपका चालान वहाँ वाक़ई दिखे। चालान या वाहन नंबर से खोजकर पता करें; यह न मान लें कि वह वहाँ पहुँच चुका है।',
      ),
    },
    {
      id: 'lok-adalat',
      status: 'alternative',
      url: LOK_ADALAT_URL,
      authority: bi('National Legal Services Authority', 'राष्ट्रीय विधिक सेवा प्राधिकरण'),
      title: bi('Consider a Lok Adalat settlement', 'लोक अदालत में समझौते पर विचार करें'),
      what: bi(
        'Lok Adalats are settlement forums held periodically, and pending traffic matters are commonly taken up in them. A settlement there ends the matter by agreement rather than by a contested hearing.',
        'लोक अदालतें समय-समय पर लगने वाले समझौता मंच हैं, और लंबित यातायात मामले अक्सर वहाँ लिए जाते हैं। वहाँ समझौता होने पर मामला सुनवाई के बजाय आपसी सहमति से ख़त्म होता है।',
      ),
      when: bi(
        'An alternative to contesting, not a replacement for checking whether the challan is correct in the first place. Dates and which matters are listed are announced by the legal services authority.',
        'यह सुनवाई का विकल्प है, पहले यह जाँचने का नहीं कि चालान सही है या नहीं। तारीख़ें और कौन से मामले सूचीबद्ध होंगे, यह विधिक सेवा प्राधिकरण बताता है।',
      ),
    },
  ];

  return { lead, caution, routes };
}

/** Every destination this module can produce, for the boundary test. */
export const officialRouteUrls = [GRIEVANCE_URL, GRIEVANCE_STATUS_URL, VIRTUAL_COURT_URL, LOK_ADALAT_URL] as const;

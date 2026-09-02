import asyncio
from supabase import create_client, Client
from config import config

supabase: Client = create_client(config.supabase_url, config.supabase_service_role_key)

def seed_rights():
    print("Clearing existing rights data...")
    try:
        supabase.table("rights_categories").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    except Exception as e:
        print(f"Error clearing categories: {e}")

    print("Seeding rights categories and articles...")

    categories_data = [
        {
            "id": "11111111-1111-1111-1111-111111111111",
            "title": "Labor & Employment",
            "subtitle": "Worker's Rights",
            "icon_name": "briefcase-outline",
            "description": "Information on wages, illegal dismissal, and benefits.",
            "display_order": 1
        },
        {
            "id": "22222222-2222-2222-2222-222222222222",
            "title": "Family Law",
            "subtitle": "Marriage & Child Support",
            "icon_name": "people-outline",
            "description": "Information on annulment, custody, and support.",
            "display_order": 2
        },
        {
            "id": "33333333-3333-3333-3333-333333333333",
            "title": "Criminal Law",
            "subtitle": "Arrests & Rights",
            "icon_name": "shield-checkmark-outline",
            "description": "Miranda rights, warrants, and criminal defense.",
            "display_order": 3
        },
        {
            "id": "44444444-4444-4444-4444-444444444444",
            "title": "Property Law",
            "subtitle": "Real Estate & Leasing",
            "icon_name": "home-outline",
            "description": "Tenant rights, property disputes, and land titles.",
            "display_order": 4
        },
        {
            "id": "55555555-5555-5555-5555-555555555555",
            "title": "Consumer Rights",
            "subtitle": "Shopping & Services",
            "icon_name": "cart-outline",
            "description": "Warranties, defective products, and refunds.",
            "display_order": 5
        },
        {
            "id": "66666666-6666-6666-6666-666666666666",
            "title": "Cybercrime & Privacy",
            "subtitle": "Online & Digital",
            "icon_name": "lock-closed-outline",
            "description": "Data privacy, cyber libel, and online scams.",
            "display_order": 6
        },
        {
            "id": "77777777-7777-7777-7777-777777777777",
            "title": "Traffic & Transportation",
            "subtitle": "Driving & Commuting",
            "icon_name": "car-outline",
            "description": "Traffic violations, accidents, and license issues.",
            "display_order": 7
        },
        {
            "id": "88888888-8888-8888-8888-888888888888",
            "title": "The Bill of Rights",
            "subtitle": "Constitutional Liberties",
            "icon_name": "scale-outline",
            "description": "Freedom of speech, due process, and equal protection.",
            "display_order": 8
        },
        {
            "id": "99999999-9999-9999-9999-999999999999",
            "title": "Business & Corporate Law",
            "subtitle": "Startups & Commerce",
            "icon_name": "business-outline",
            "description": "Business registration, contracts, and taxation.",
            "display_order": 9
        },
        {
            "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "title": "Environmental Rights",
            "subtitle": "Nature & Ecology",
            "icon_name": "leaf-outline",
            "description": "Right to a balanced ecology, pollution laws.",
            "display_order": 10
        },
        {
            "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            "title": "Intellectual Property",
            "subtitle": "Copyright & Trademarks",
            "icon_name": "bulb-outline",
            "description": "Copyright infringement, patents, and trademarks.",
            "display_order": 11
        },
        {
            "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
            "title": "Medical & Health",
            "subtitle": "Patients & Healthcare",
            "icon_name": "medkit-outline",
            "description": "Patient's rights, medical malpractice, and PhilHealth.",
            "display_order": 12
        },
        {
            "id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
            "title": "Tax & Customs",
            "subtitle": "Taxpayer Rights",
            "icon_name": "cash-outline",
            "description": "Income tax, BIR audits, and customs duties.",
            "display_order": 13
        },
        {
            "id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
            "title": "Education & Student Rights",
            "subtitle": "Schools & Academics",
            "icon_name": "school-outline",
            "description": "Campus journalism, bullying, and free education.",
            "display_order": 14
        }
    ]

    for cat in categories_data:
        try:
            supabase.table("rights_categories").insert(cat).execute()
        except Exception as e:
            print(f"Error inserting category {cat['title']}: {e}")

    articles_data = [
        # Labor
        {
            "category_id": "11111111-1111-1111-1111-111111111111",
            "title": "Minimum Wage & Overtime Pay",
            "detail": "Employees have the right to receive at least the minimum wage in their region and 25% premium for overtime work.",
            "law_section": "Labor Code of the Philippines"
        },
        {
            "category_id": "11111111-1111-1111-1111-111111111111",
            "title": "Security of Tenure",
            "detail": "An employee cannot be dismissed without just or authorized cause and due process. Illegal dismissal entitles the worker to reinstatement and backwages.",
            "law_section": "Labor Code of the Philippines"
        },
        {
            "category_id": "11111111-1111-1111-1111-111111111111",
            "title": "13th Month Pay",
            "detail": "All rank-and-file employees are entitled to a 13th-month pay, to be given not later than December 24 of every year.",
            "law_section": "Presidential Decree No. 851"
        },

        # Family
        {
            "category_id": "22222222-2222-2222-2222-222222222222",
            "title": "Child Support",
            "detail": "Parents are legally obliged to support their children based on their financial capacity.",
            "law_section": "Family Code & R.A. 9262"
        },
        {
            "category_id": "22222222-2222-2222-2222-222222222222",
            "title": "Annulment & Legal Separation",
            "detail": "The Philippines allows legal separation and annulment. Psychological incapacity is a common ground for annulment.",
            "law_section": "Family Code of the Philippines"
        },
        {
            "category_id": "22222222-2222-2222-2222-222222222222",
            "title": "Violence Against Women & Children (VAWC)",
            "detail": "Women and their children are protected against physical, sexual, psychological, and economic abuse by their partners.",
            "law_section": "R.A. 9262"
        },

        # Criminal
        {
            "category_id": "33333333-3333-3333-3333-333333333333",
            "title": "Rights During Arrest (Miranda Rights)",
            "detail": "You have the right to remain silent, the right to competent and independent counsel, and the right to be informed of the nature and cause of accusations.",
            "law_section": "1987 Constitution, Art III Sec 12"
        },
        {
            "category_id": "33333333-3333-3333-3333-333333333333",
            "title": "Warrant of Arrest Rules",
            "detail": "Police generally need a valid warrant of arrest issued by a judge. Warrantless arrests are only valid if caught in the act, in hot pursuit, or if an escaped prisoner.",
            "law_section": "Rules of Court Rule 113"
        },
        {
            "category_id": "33333333-3333-3333-3333-333333333333",
            "title": "Bail Rights",
            "detail": "All persons, except those charged with offenses punishable by reclusion perpetua when evidence of guilt is strong, have the right to bail before conviction.",
            "law_section": "1987 Constitution, Art III Sec 13"
        },

        # Property
        {
            "category_id": "44444444-4444-4444-4444-444444444444",
            "title": "Tenant Eviction Rights",
            "detail": "A landlord cannot forcibly evict a tenant without a valid court order. Three months unpaid rent is a valid ground for eviction.",
            "law_section": "Rent Control Act of 2009 (R.A. 9653)"
        },
        {
            "category_id": "44444444-4444-4444-4444-444444444444",
            "title": "Land Titles and Deeds",
            "detail": "A Torrens Title (TCT/OCT) is the best proof of ownership. Buyers must verify the title with the Registry of Deeds before purchasing.",
            "law_section": "Property Registration Decree"
        },
        {
            "category_id": "44444444-4444-4444-4444-444444444444",
            "title": "Eminent Domain",
            "detail": "The government can seize private property for public use, provided there is due process and payment of just compensation.",
            "law_section": "1987 Constitution, Art III Sec 9"
        },

        # Consumer
        {
            "category_id": "55555555-5555-5555-5555-555555555555",
            "title": "No Return, No Exchange Policy is Illegal",
            "detail": "Stores cannot implement an absolute 'No Return, No Exchange' policy. Consumers have the right to return defective goods within 7 days.",
            "law_section": "Consumer Act of the Philippines (R.A. 7394)"
        },
        {
            "category_id": "55555555-5555-5555-5555-555555555555",
            "title": "Senior Citizen & PWD Discounts",
            "detail": "Senior citizens and PWDs are entitled to a 20% discount and VAT exemption on medicines, medical services, transport fares, hotels, and restaurants.",
            "law_section": "Expanded Senior Citizens Act / Magna Carta for PWDs"
        },
        
        # Cybercrime
        {
            "category_id": "66666666-6666-6666-6666-666666666666",
            "title": "Data Privacy Rights",
            "detail": "You have the right to be informed, right to access, right to object, and right to erasure of your personal data collected by any entity.",
            "law_section": "Data Privacy Act of 2012 (R.A. 10173)"
        },
        {
            "category_id": "66666666-6666-6666-6666-666666666666",
            "title": "Cyber Libel",
            "detail": "Public and malicious imputation of a crime or defect through computer systems or the internet is punishable with higher penalties than traditional libel.",
            "law_section": "Cybercrime Prevention Act of 2012 (R.A. 10175)"
        },

        # Traffic
        {
            "category_id": "77777777-7777-7777-7777-777777777777",
            "title": "Confiscation of Driver's License",
            "detail": "Traffic enforcers cannot confiscate your license unless you are involved in an accident, have accumulated 3 or more unpaid violations, or are deputized by LTO.",
            "law_section": "LTO and MMDA Guidelines"
        },
        {
            "category_id": "77777777-7777-7777-7777-777777777777",
            "title": "Anti-Distracted Driving",
            "detail": "Using mobile phones or devices while driving (even when stopped at a red light) is prohibited unless using a hands-free device.",
            "law_section": "Anti-Distracted Driving Act (R.A. 10913)"
        },

        # The Bill of Rights
        {
            "category_id": "88888888-8888-8888-8888-888888888888",
            "title": "Right to Due Process and Equal Protection",
            "detail": "No person shall be deprived of life, liberty, or property without due process of law, nor shall any person be denied the equal protection of the laws.",
            "law_section": "1987 Constitution, Art III Sec 1"
        },
        {
            "category_id": "88888888-8888-8888-8888-888888888888",
            "title": "Right Against Unreasonable Searches and Seizures",
            "detail": "The right of the people to be secure in their persons, houses, papers, and effects against unreasonable searches and seizures of whatever nature and for any purpose shall be inviolable.",
            "law_section": "1987 Constitution, Art III Sec 2"
        },
        {
            "category_id": "88888888-8888-8888-8888-888888888888",
            "title": "Right to Privacy of Communication",
            "detail": "The privacy of communication and correspondence shall be inviolable except upon lawful order of the court. Any evidence obtained in violation of this is inadmissible.",
            "law_section": "1987 Constitution, Art III Sec 3"
        },
        {
            "category_id": "88888888-8888-8888-8888-888888888888",
            "title": "Freedom of Speech and of the Press",
            "detail": "No law shall be passed abridging the freedom of speech, of expression, or of the press, or the right of the people peaceably to assemble and petition the government for redress of grievances.",
            "law_section": "1987 Constitution, Art III Sec 4"
        },
        {
            "category_id": "88888888-8888-8888-8888-888888888888",
            "title": "Freedom of Religion",
            "detail": "No law shall be made respecting an establishment of religion, or prohibiting the free exercise thereof. The free exercise and enjoyment of religious profession shall forever be allowed.",
            "law_section": "1987 Constitution, Art III Sec 5"
        },
        {
            "category_id": "88888888-8888-8888-8888-888888888888",
            "title": "Liberty of Abode and Travel",
            "detail": "The liberty of abode and of changing the same within the limits prescribed by law shall not be impaired except upon lawful order of the court.",
            "law_section": "1987 Constitution, Art III Sec 6"
        },
        {
            "category_id": "88888888-8888-8888-8888-888888888888",
            "title": "Right to Information",
            "detail": "The right of the people to information on matters of public concern shall be recognized. Access to official records and documents shall be afforded the citizen.",
            "law_section": "1987 Constitution, Art III Sec 7"
        },
        {
            "category_id": "88888888-8888-8888-8888-888888888888",
            "title": "Right to Form Unions and Associations",
            "detail": "The right of the people, including those employed in the public and private sectors, to form unions, associations, or societies for purposes not contrary to law shall not be abridged.",
            "law_section": "1987 Constitution, Art III Sec 8"
        },
        {
            "category_id": "88888888-8888-8888-8888-888888888888",
            "title": "Non-Impairment of Contracts",
            "detail": "No law impairing the obligation of contracts shall be passed.",
            "law_section": "1987 Constitution, Art III Sec 10"
        },
        {
            "category_id": "88888888-8888-8888-8888-888888888888",
            "title": "Free Access to Courts",
            "detail": "Free access to the courts and quasi-judicial bodies and adequate legal assistance shall not be denied to any person by reason of poverty.",
            "law_section": "1987 Constitution, Art III Sec 11"
        },
        {
            "category_id": "88888888-8888-8888-8888-888888888888",
            "title": "Right to a Speedy Trial",
            "detail": "All persons shall have the right to a speedy disposition of their cases before all judicial, quasi-judicial, or administrative bodies.",
            "law_section": "1987 Constitution, Art III Sec 16"
        },
        {
            "category_id": "88888888-8888-8888-8888-888888888888",
            "title": "Right Against Self-Incrimination",
            "detail": "No person shall be compelled to be a witness against himself.",
            "law_section": "1987 Constitution, Art III Sec 17"
        },
        {
            "category_id": "88888888-8888-8888-8888-888888888888",
            "title": "Prohibition of Torture and Cruel Punishment",
            "detail": "No torture, force, violence, threat, intimidation, or any other means which vitiate the free will shall be used against any person. Neither shall excessive fines be imposed, nor cruel, degrading or inhuman punishment inflicted.",
            "law_section": "1987 Constitution, Art III Sec 12 & 19"
        },
        {
            "category_id": "88888888-8888-8888-8888-888888888888",
            "title": "Right Against Double Jeopardy",
            "detail": "No person shall be twice put in jeopardy of punishment for the same offense.",
            "law_section": "1987 Constitution, Art III Sec 21"
        },
        {
            "category_id": "88888888-8888-8888-8888-888888888888",
            "title": "Ex Post Facto Law and Bill of Attainder",
            "detail": "No ex post facto law or bill of attainder shall be enacted. This means a law cannot retroactively criminalize an action that was legal when committed.",
            "law_section": "1987 Constitution, Art III Sec 22"
        },

        # Business
        {
            "category_id": "99999999-9999-9999-9999-999999999999",
            "title": "One Person Corporation (OPC)",
            "detail": "A corporation with a single stockholder can now be established, removing the need for a minimum of 5 incorporators.",
            "law_section": "Revised Corporation Code (R.A. 11232)"
        },

        # Environmental
        {
            "category_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "title": "Right to a Balanced Ecology",
            "detail": "The State protects and advances the right of the people to a balanced and healthful ecology in accord with the rhythm and harmony of nature.",
            "law_section": "1987 Constitution, Art II Sec 16"
        },

        # IP
        {
            "category_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            "title": "Copyright Protection",
            "detail": "Original intellectual creations (books, music, software) are protected from the moment of creation without need for registration.",
            "law_section": "Intellectual Property Code (R.A. 8293)"
        },

        # Medical
        {
            "category_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
            "title": "Anti-Hospital Deposit Law",
            "detail": "Hospitals cannot demand advance payment or deposits before administering basic emergency care.",
            "law_section": "Anti-Hospital Deposit Law (R.A. 10932)"
        },

        # Tax
        {
            "category_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
            "title": "Taxpayer's Right to Due Process",
            "detail": "A taxpayer has the right to be informed of the legal and factual bases of any tax assessment. A Preliminary Assessment Notice (PAN) must be issued before a Final Assessment Notice (FAN).",
            "law_section": "National Internal Revenue Code (NIRC) Sec 228"
        },
        {
            "category_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
            "title": "Right to Protest an Assessment",
            "detail": "Taxpayers have 30 days from receipt of a Final Assessment Notice to file a protest (Request for Reconsideration or Reinvestigation).",
            "law_section": "National Internal Revenue Code (NIRC) Sec 228"
        },
        {
            "category_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
            "title": "Right to Claim a Tax Refund",
            "detail": "Taxpayers have the right to claim a refund for erroneously or illegally collected taxes within 2 years from the date of payment.",
            "law_section": "National Internal Revenue Code (NIRC) Sec 204 & 229"
        },
        {
            "category_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
            "title": "Protection Against Unreasonable BIR Audits",
            "detail": "The BIR can generally only examine the taxpayer's books and records once for a given taxable year, and requires a valid Letter of Authority (LOA).",
            "law_section": "National Internal Revenue Code (NIRC) Sec 235"
        },
        {
            "category_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
            "title": "Customs Passenger Baggage Exemption",
            "detail": "Filipino citizens and residents returning to the Philippines are granted tax and duty exemptions for personal effects up to a certain de minimis value (e.g. PHP 10,000 threshold for imported goods).",
            "law_section": "Customs Modernization and Tariff Act (CMTA)"
        },

        # Education
        {
            "category_id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
            "title": "Free Higher Education",
            "detail": "All Filipino students who pass the admission exams are exempt from paying tuition and other school fees in State Universities and Colleges (SUCs) and Local Universities and Colleges (LUCs).",
            "law_section": "Universal Access to Quality Tertiary Education Act (R.A. 10931)"
        },
        {
            "category_id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
            "title": "Anti-Bullying Act",
            "detail": "All elementary and secondary schools must adopt policies to address bullying. Students have the right to a safe environment free from physical, psychological, and cyber bullying.",
            "law_section": "Anti-Bullying Act of 2013 (R.A. 10627)"
        },
        {
            "category_id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
            "title": "Campus Journalism",
            "detail": "Students have the right to establish and publish campus newspapers without unreasonable censorship or administrative retaliation.",
            "law_section": "Campus Journalism Act of 1991 (R.A. 7079)"
        },
        {
            "category_id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
            "title": "Right to Academic Freedom",
            "detail": "Institutions of higher learning enjoy academic freedom, which encompasses the freedom to determine who may teach, what may be taught, how it shall be taught, and who may be admitted to study.",
            "law_section": "1987 Constitution, Art XIV Sec 5"
        },
        {
            "category_id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
            "title": "Student's Right Against Illegal Search in Schools",
            "detail": "While students have diminished privacy expectations in school, random bag searches must still conform to reasonable standards and cannot be arbitrary or overly intrusive without valid suspicion.",
            "law_section": "Bill of Rights (Jurisprudence)"
        }
    ]

    for art in articles_data:
        try:
            supabase.table("rights_articles").insert(art).execute()
        except Exception as e:
            print(f"Error inserting article {art['title']}: {e}")

    print("Seeding complete!")

if __name__ == "__main__":
    seed_rights()

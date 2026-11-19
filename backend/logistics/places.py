"""Provincial capitals used for driver search. Coordinates are city centers."""

CITIES = [
    {"province": "آذربایجان شرقی", "name": "تبریز", "lat": 38.08, "lng": 46.2919},
    {"province": "آذربایجان غربی", "name": "ارومیه", "lat": 37.5527, "lng": 45.0761},
    {"province": "اردبیل", "name": "اردبیل", "lat": 38.2498, "lng": 48.2933},
    {"province": "اصفهان", "name": "اصفهان", "lat": 32.6539, "lng": 51.6660},
    {"province": "البرز", "name": "کرج", "lat": 35.8400, "lng": 50.9391},
    {"province": "ایلام", "name": "ایلام", "lat": 33.6374, "lng": 46.4227},
    {"province": "بوشهر", "name": "بوشهر", "lat": 28.9234, "lng": 50.8203},
    {"province": "تهران", "name": "تهران", "lat": 35.6892, "lng": 51.3890},
    {"province": "چهارمحال و بختیاری", "name": "شهرکرد", "lat": 32.3256, "lng": 50.8644},
    {"province": "خراسان جنوبی", "name": "بیرجند", "lat": 32.8663, "lng": 59.2211},
    {"province": "خراسان رضوی", "name": "مشهد", "lat": 36.2605, "lng": 59.6168},
    {"province": "خراسان شمالی", "name": "بجنورد", "lat": 37.4750, "lng": 57.3290},
    {"province": "خوزستان", "name": "اهواز", "lat": 31.3183, "lng": 48.6706},
    {"province": "زنجان", "name": "زنجان", "lat": 36.6736, "lng": 48.4787},
    {"province": "سمنان", "name": "سمنان", "lat": 35.5729, "lng": 53.3974},
    {"province": "سیستان و بلوچستان", "name": "زاهدان", "lat": 29.4963, "lng": 60.8629},
    {"province": "فارس", "name": "شیراز", "lat": 29.5918, "lng": 52.5837},
    {"province": "قزوین", "name": "قزوین", "lat": 36.2797, "lng": 50.0049},
    {"province": "قم", "name": "قم", "lat": 34.6416, "lng": 50.8746},
    {"province": "کردستان", "name": "سنندج", "lat": 35.3219, "lng": 46.9862},
    {"province": "کرمان", "name": "کرمان", "lat": 30.2839, "lng": 57.0834},
    {"province": "کرمانشاه", "name": "کرمانشاه", "lat": 34.3277, "lng": 47.0778},
    {"province": "کهگیلویه و بویراحمد", "name": "یاسوج", "lat": 30.6684, "lng": 51.5875},
    {"province": "گلستان", "name": "گرگان", "lat": 36.8456, "lng": 54.4393},
    {"province": "گیلان", "name": "رشت", "lat": 37.2808, "lng": 49.5832},
    {"province": "لرستان", "name": "خرم‌آباد", "lat": 33.4878, "lng": 48.3558},
    {"province": "مازندران", "name": "ساری", "lat": 36.5633, "lng": 53.0601},
    {"province": "مرکزی", "name": "اراک", "lat": 34.0954, "lng": 49.7013},
    {"province": "هرمزگان", "name": "بندرعباس", "lat": 27.1832, "lng": 56.2666},
    {"province": "همدان", "name": "همدان", "lat": 34.7983, "lng": 48.5148},
    {"province": "یزد", "name": "یزد", "lat": 31.8974, "lng": 54.3569},
    {"province": "خراسان رضوی", "name": "نیشابور", "lat": 36.2140, "lng": 58.7961},
    {"province": "تهران", "name": "ری", "lat": 35.4960, "lng": 51.4340},
    {"province": "خوزستان", "name": "آبادان", "lat": 30.3392, "lng": 48.3043},
]


def provinces():
    seen = []
    for city in CITIES:
        if city["province"] not in seen:
            seen.append(city["province"])
    return seen


def lookup(label):
    text = (label or "").strip()
    if not text:
        return None
    for city in CITIES:
        if city["name"] == text or city["name"] in text:
            return city
    for city in CITIES:
        if text in city["province"]:
            return city
    return None

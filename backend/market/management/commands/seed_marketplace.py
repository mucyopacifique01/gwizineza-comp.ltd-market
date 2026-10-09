from django.core.management.base import BaseCommand
from django.utils import timezone

from market.models import Category, DeliveryZone, PaymentRecord, Product, StoreOrder, StoreOrderItem


PRODUCTS = [
    ("DOV-001", "Dove Go Fresh Beauty Bar", "dove-go-fresh-beauty-bar", 320, 50, "Personal Care", "/products/dove-soap.jpg"),
    ("RIC-001", "Rice 10kg", "rice-10kg", 12000, 30, "Groceries", "/products/rice-10kg.jpg"),
    ("RIC-002", "Rice Bag", "rice-bag", 29500, 30, "Groceries", "/products/rice-bag.jpg"),
    ("SUG-001", "Sugar Cane", "sugar-cane", 55000, 40, "Groceries", "/products/sugar.jpg"),
    ("OIL-001", "Cooking Oil", "oil", 4800, 25, "Groceries", None),
    ("STR-001", "Oil Strainer", "oil-strainer", 8000, 15, "Home & Kitchen", None),
    ("SPK-001", "Spark Plug", "spark-plug", 8000, 20, "Automotive", None),
    ("UMB-001", "Umbrella", "umbrella", 2800, 20, "Accessories", None),
    ("FLA-001", "Flashlight", "flashlight", 3000, 25, "Home & Kitchen", None),
    ("UND-001", "Underwear", "underwear", 4900, 20, "Clothing", None),
    ("SOC-001", "Socks", "socks", 6000, 20, "Clothing", None),
    ("BRU-001", "Brush", "brush", 2000, 30, "Personal Care", None),
    ("NOT-001", "Notebooks", "notebooks", 3000, 40, "Stationery", None),
    ("REG-001", "Register", "register", 6500, 15, "Stationery", None),
    ("STR-002", "Straw", "straw", 3000, 50, "Home & Kitchen", None),
]

ZONES = [
    ("Kigali City Center", 1500, 1, 1),
    ("Kicukiro", 1800, 1, 2),
    ("Gasabo", 2000, 1, 2),
    ("Nyarugenge", 1500, 1, 1),
    ("Musanze", 4500, 2, 4),
    ("Huye", 5000, 2, 4),
]

SAMPLE_ORDERS = [
    (
        "Aline Uwase", "0788123456", "KN 4 Ave, Kigali City Center",
        [("RIC-001", 2), ("OIL-001", 3)], "DELIVERED", "PAID", "MOMO",
    ),
    (
        "Eric Nshimiyimana", "0723456789", "KG 7 Ave, Kicukiro",
        [("SUG-001", 1), ("FLA-001", 2)], "PROCESSING", "PENDING", "COD",
    ),
    (
        "Josiane Mukamana", "0788987654", "KN 67 Rd, Nyarugenge",
        [("DOV-001", 5), ("BRU-001", 4), ("NOT-001", 6)], "ORDERED", "PENDING", "COD",
    ),
]


class Command(BaseCommand):
    help = (
        "Insert the sample Gwizineza starter catalog, delivery zones and sample "
        "orders into Supabase PostgreSQL. Safe to run repeatedly."
    )

    def handle(self, *args, **options):
        for sku, name, slug, price, stock, category_name, image in PRODUCTS:
            category_slug = category_name.lower().replace(" & ", "-").replace(" ", "-")
            category, _ = Category.objects.get_or_create(
                slug=category_slug, defaults={"name": category_name}
            )
            Product.objects.update_or_create(
                sku=sku,
                defaults={
                    "name": name,
                    "slug": slug,
                    "price_rwf": price,
                    "stock": stock,
                    "image_url": image,
                    "category": category,
                    "is_active": True,
                },
            )
        self.stdout.write(self.style.SUCCESS("Starter catalog is ready in Supabase PostgreSQL."))

        for name, fee, eta_min, eta_max in ZONES:
            DeliveryZone.objects.update_or_create(
                name=name,
                defaults={"fee_rwf": fee, "eta_min_days": eta_min, "eta_max_days": eta_max, "active": True},
            )
        self.stdout.write(self.style.SUCCESS("Delivery zones are ready."))

        for customer_name, phone, address, lines, status, pay_status, method in SAMPLE_ORDERS:
            items = []
            subtotal = 0
            for sku, qty in lines:
                product = Product.objects.filter(sku=sku).first()
                if not product:
                    continue
                items.append((product, product.price_rwf, qty))
                subtotal += product.price_rwf * qty
            if not items or subtotal <= 0:
                continue
            delivery = DeliveryZone.objects.filter(active=True).first()
            delivery_fee = delivery.fee_rwf if delivery else 1500
            total = subtotal + delivery_fee
            suffix = timezone.now().strftime("%H%M%S")
            order, created = StoreOrder.objects.get_or_create(
                order_number=f"GWZ-{phone[-4:]}-{suffix}",
                defaults={
                    "status": status,
                    "customer_name": customer_name,
                    "phone": phone,
                    "delivery_address": address,
                    "subtotal_rwf": subtotal,
                    "delivery_rwf": delivery_fee,
                    "total_rwf": total,
                },
            )
            if not created:
                continue
            for product, unit_price, qty in items:
                StoreOrderItem.objects.create(
                    order=order,
                    product=product,
                    product_name=product.name,
                    unit_price_rwf=unit_price,
                    quantity=qty,
                    line_total_rwf=unit_price * qty,
                )
            PaymentRecord.objects.create(
                order=order,
                method=method,
                status=pay_status,
                amount_rwf=total,
            )
        self.stdout.write(self.style.SUCCESS("Sample orders are ready in the admin panel."))

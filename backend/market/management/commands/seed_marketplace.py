from django.core.management.base import BaseCommand
from market.models import Category, Product


PRODUCTS = [
    ("DOV-001", "Dove Go Fresh Beauty Bar", "dove-go-fresh-beauty-bar", 320, 50, "Personal Care", "/products/dove-soap.jpg"),
    ("RIC-001", "Rice 10kg", "rice-10kg", 12000, 30, "Groceries", "/products/rice-10kg.jpg"),
    ("RIC-002", "Rice Bag", "rice-bag", 29500, 30, "Groceries", "/products/rice-bag.jpg"),
    ("SUG-001", "Sugar Cane", "sugar-cane", 55000, 40, "Groceries", "/products/sugar.jpg"),
    ("OIL-001", "Cooking Oil", "oil", 4800, 0, "Groceries", None),
    ("STR-001", "Oil Strainer", "oil-strainer", 8000, 0, "Home & Kitchen", None),
    ("SPK-001", "Spark Plug", "spark-plug", 800, 0, "Automotive", None),
    ("UMB-001", "Umbrella", "umbrella", 2800, 0, "Accessories", None),
    ("FLA-001", "Flashlight", "flashlight", 3000, 0, "Home & Kitchen", None),
    ("UND-001", "Underwear", "underwear", 4900, 0, "Clothing", None),
    ("SOC-001", "Socks", "socks", 6000, 0, "Clothing", None),
    ("BRU-001", "Brush", "brush", 2000, 0, "Personal Care", None),
    ("NOT-001", "Notebooks", "notebooks", 3000, 0, "Stationery", None),
    ("REG-001", "Register", "register", 6500, 0, "Stationery", None),
    ("STR-002", "Straw", "straw", 3000, 0, "Home & Kitchen", None),
]


class Command(BaseCommand):
    help = "Insert the sample Gwizineza starter catalog into Supabase PostgreSQL."

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

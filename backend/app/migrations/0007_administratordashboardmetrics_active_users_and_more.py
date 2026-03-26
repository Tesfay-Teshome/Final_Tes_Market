
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0006_category_is_global_category_vendor_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='active_users',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='active_vendors',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='aov_change',
            field=models.FloatField(default=0.0),
        ),
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='average_order_value',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='cancelled_orders',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='completed_orders',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='conversion_rate',
            field=models.FloatField(default=0.0),
        ),
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='conversion_rate_change',
            field=models.FloatField(default=0.0),
        ),
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='new_users_today',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='open_disputes',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='order_growth',
            field=models.FloatField(default=0.0),
        ),
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='out_of_stock_products',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='pending_orders',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='pending_product_approvals',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='pending_vendor_approvals',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='platform_revenue',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='refund_requests',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='revenue_growth',
            field=models.FloatField(default=0.0),
        ),
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='user_growth',
            field=models.FloatField(default=0.0),
        ),
        migrations.AddField(
            model_name='administratordashboardmetrics',
            name='vendor_growth',
            field=models.FloatField(default=0.0),
        ),
    ]

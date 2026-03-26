from django import forms
from django.contrib.auth import get_user_model
from .models import Product, ProductVariant, ProductImage, Order

User = get_user_model()

class UserRegistrationForm(forms.ModelForm):
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={'autocomplete': 'new-password'}),
        min_length=6,
        help_text="Password must be at least 6 characters"
    )
    confirm_password = forms.CharField(
        widget=forms.PasswordInput(attrs={'autocomplete': 'new-password'}),
        label="Confirm Password"
    )

    class Meta:
        model = User
        fields = [
            'username', 
            'email', 
            'user_type', 
            'phone', 
            'address', 
            'profile_image',
            'store_name',
            'store_description',
            'password',
            'confirm_password'
        ]
        labels = {
            'user_type': 'Account Type',
            'profile_image': 'Profile Picture'
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['store_name'].required = False
        self.fields['store_description'].required = False

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        confirm_password = cleaned_data.get('confirm_password')
        user_type = cleaned_data.get('user_type')

        if password and confirm_password and password != confirm_password:
            self.add_error('confirm_password', "Passwords do not match")

        if user_type == 'vendor':
            if not cleaned_data.get('store_name'):
                self.add_error('store_name', "Store name is required for vendors")
            if not cleaned_data.get('store_description'):
                self.add_error('store_description', "Store description is required for vendors")

        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password"])
        
        if commit:
            user.save()
            if user.user_type == 'vendor':
                user.store_name = self.cleaned_data['store_name']
                user.store_description = self.cleaned_data['store_description']
                user.save()
        return user

class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = ('category', 'name', 'description', 'price', 'stock', 'is_active')
        widgets = {
            'description': forms.Textarea(attrs={'rows': 4}),
        }

class ProductVariantForm(forms.ModelForm):
    class Meta:
        model = ProductVariant
        fields = ('name', 'value', 'price_adjustment', 'stock')
        widgets = {
            'price_adjustment': forms.NumberInput(attrs={'step': 0.01})
        }

class ProductImageForm(forms.ModelForm):
    class Meta:
        model = ProductImage
        fields = ('image', 'is_primary', 'alt_text')
        widgets = {
            'alt_text': forms.TextInput(attrs={'placeholder': 'Image description'})
        }

class OrderUpdateForm(forms.ModelForm):
    class Meta:
        model = Order
        fields = ('status',)
        widgets = {
            'status': forms.Select(attrs={'class': 'form-select'})
        }

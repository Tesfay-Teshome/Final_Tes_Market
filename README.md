# Tes Market
A modern multi-vendor marketplace platform built with Django and React.

## Features

### For Buyers
- Browse products by categories
- Advanced search and filtering
- Shopping cart functionality
- Secure checkout process
- Order tracking
- Product reviews and ratings
- Wishlist management

### For Vendors
- Product management dashboard
- Inventory tracking
- Order management
- Sales analytics
- Transaction history
- Commission tracking

### For Admins
- User management
- Vendor approval system
- Category management
- Commission management
- Platform analytics
- Transaction oversight

## Tech Stack

### Backend
- Django 5.0.1
- Django REST Framework
- JWT Authentication
- PostgreSQL (configurable)
- Stripe Payment Integration

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- React Query
- React Router

## Setup Instructions

### Backend Setup
1. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
- Copy `.env.example` to `.env`
- Update the variables in `.env`

4. Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

5. Create superuser:
```bash
python manage.py createsuperuser
```

6. Run development server:
```bash
python manage.py runserver
```

### Frontend Setup
1. Install Node.js dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- POST /api/token/ - Obtain JWT token
- POST /api/token/refresh/ - Refresh JWT token

### Users
- GET/POST /api/users/ - List/Create users
- GET/PUT/DELETE /api/users/{id}/ - Retrieve/Update/Delete user

### Products
- GET/POST /api/products/ - List/Create products
- GET/PUT/DELETE /api/products/{slug}/ - Retrieve/Update/Delete product

### Orders
- GET/POST /api/orders/ - List/Create orders
- GET/PUT /api/orders/{id}/ - Retrieve/Update order

### Categories
- GET/POST /api/categories/ - List/Create categories
- GET/PUT/DELETE /api/categories/{slug}/ - Retrieve/Update/Delete category

## Contributing
Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the Chapi Tech License - see the LICENSE file for details.

## Developer
Developed by Tesfay Teshome (Chapi Tech)
***
# contact Info
Phone Number: +251992846900
Email : tesfix2017@gmail.com
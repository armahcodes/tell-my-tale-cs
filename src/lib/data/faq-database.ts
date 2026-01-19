export type FAQCategory = 'orders' | 'shipping' | 'returns' | 'customization' | 'payment' | 'general';

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: FAQCategory;
  keywords: string[];
}

export const faqDatabase: FAQ[] = [
  // CUSTOMIZATION - How to create a book
  {
    id: 'cust-001',
    question: 'How do I create a personalized book?',
    answer: `Creating your personalized book is easy! Here's how:

1. **Pick a story theme** – Choose from magical adventures like The Princess Inside, Superhero, Animal Adventure, Space Adventure, and many more!

2. **Upload a photo** – Add a clear photo of your child. We'll turn it into a fun AI-style illustration that appears right in the book!

3. **Personalize it** – Add your child's name, appearance details, and a sweet dedication to make the story truly theirs.

4. **Preview & Approve** – You'll get to see a preview of your custom book before we print it.

5. **Delivered to your door** – After approval, we print and ship your book in 5-10 business days.`,
    category: 'customization',
    keywords: ['create', 'personalize', 'how', 'make', 'start', 'book', 'steps'],
  },
  {
    id: 'cust-002',
    question: 'Can I see the book before ordering?',
    answer: `Yes, you sure can! 

After you personalize the story, we'll show you an **instant preview** of what your book will look like — all before we print anything.

Take your time, check the details, and if you'd like anything changed, just let us know!`,
    category: 'customization',
    keywords: ['preview', 'see', 'before', 'look', 'check', 'sample'],
  },
  {
    id: 'cust-003',
    question: 'Is my child\'s photo and information safe?',
    answer: `Absolutely! Your privacy means the world to us.

We only use your photo and info to create your book — **never** for anything else.

We don't sell, share, or store your data, and all photos are deleted from our system once your book is printed. You're in safe hands!`,
    category: 'customization',
    keywords: ['safe', 'privacy', 'photo', 'data', 'secure', 'information', 'private'],
  },
  {
    id: 'cust-004',
    question: 'What are the photo requirements?',
    answer: `For the best results with your personalized book:

- **Resolution**: At least 1000x1000 pixels
- **Format**: JPG or PNG
- **File size**: Up to 10MB
- **Best tips**: 
  - Use a clear, front-facing photo
  - Good lighting works best
  - Avoid sunglasses or hats
  - Smiling photos create the best results!`,
    category: 'customization',
    keywords: ['photo', 'picture', 'image', 'requirements', 'upload', 'resolution', 'format'],
  },

  // ORDERS
  {
    id: 'ord-001',
    question: 'Can I make changes after I place my order?',
    answer: `Yes! We want you to love your book.

If you need to make any edits, just let us know within **24 hours** of placing your order. We offer **free unlimited revisions** to make sure it's just perfect!

After 24 hours, we start printing, but we'll still do our best to help however we can.`,
    category: 'orders',
    keywords: ['change', 'edit', 'modify', 'update', 'revision', 'fix', 'correction', 'after'],
  },
  {
    id: 'ord-002',
    question: 'How do I check my order status?',
    answer: `You can check your order status anytime! Just provide your order number (found in your confirmation email) or the email address you used when placing the order.

I can look up your order and tell you exactly where it is in our production process! You can also visit our Track Order page on the website.`,
    category: 'orders',
    keywords: ['status', 'order', 'check', 'track', 'where', 'progress'],
  },
  {
    id: 'ord-003',
    question: 'Can I cancel my order?',
    answer: `Want to cancel or make changes? Please contact us within **24 hours of placing your order** so we can catch it before printing begins!

After 24 hours, we've usually started production on your personalized book, so cancellations become more difficult. But reach out and we'll do our best to help!`,
    category: 'orders',
    keywords: ['cancel', 'cancellation', 'stop', 'order'],
  },

  // SHIPPING
  {
    id: 'ship-001',
    question: 'How long will my book take to arrive?',
    answer: `Once you approve your preview, we'll start printing right away. Your personalized storybook will arrive at your door in **5-10 business days**.

We also offer Express Shipping (3-5 business days) for those special occasions when you need it faster!`,
    category: 'shipping',
    keywords: ['long', 'arrive', 'delivery', 'shipping', 'time', 'when', 'days'],
  },
  {
    id: 'ship-002',
    question: 'What shipping options do you offer?',
    answer: `We offer two shipping options:

- **Standard Shipping**: 5-10 business days (FREE!)
- **Express Shipping**: 3-5 business days ($9.99)

All shipping times are calculated from when you approve your book preview.`,
    category: 'shipping',
    keywords: ['shipping', 'options', 'delivery', 'express', 'standard', 'fast'],
  },
  {
    id: 'ship-003',
    question: 'How do I track my shipment?',
    answer: `Once your book ships, you'll receive an email with your tracking number. You can also ask me to look up tracking information using your order number!

I can tell you exactly where your package is and when it's expected to arrive. You can also visit our Track Order page on tellmytale.com.`,
    category: 'shipping',
    keywords: ['track', 'tracking', 'shipment', 'package', 'where', 'status'],
  },

  // RETURNS & REFUNDS
  {
    id: 'ret-001',
    question: 'What\'s your return or refund policy?',
    answer: `Each book is made just for your child, so we're not able to accept returns for things like name typos or changes in design.

But if we made a mistake, don't worry—we'll fix it and send you a **replacement at no cost**.

For damaged or incorrect orders, just email us at **support@tellmytale.com** with a photo and your order number.

Want to cancel or make changes? Please contact us within **24 hours of placing your order** so we can catch it before printing begins!`,
    category: 'returns',
    keywords: ['return', 'refund', 'policy', 'money back', 'replacement', 'damaged'],
  },
  {
    id: 'ret-002',
    question: 'My book arrived damaged, what should I do?',
    answer: `Oh no! We're so sorry your book arrived damaged. 

Please email us at **support@tellmytale.com** with:
- A photo of the damage
- Your order number

We'll send you a **replacement at no cost** right away! We want your child to have a perfect book.`,
    category: 'returns',
    keywords: ['damaged', 'broken', 'bent', 'torn', 'ripped', 'defective'],
  },
  {
    id: 'ret-003',
    question: 'The book doesn\'t look like what I ordered',
    answer: `I'm sorry the book doesn't match your expectations! 

If we made a mistake on our end, we'll absolutely make it right with a corrected replacement at no cost.

Please email **support@tellmytale.com** with your order number and let us know specifically what looks different. We're here to help!`,
    category: 'returns',
    keywords: ['wrong', 'different', 'not what', 'doesn\'t match', 'incorrect', 'mistake'],
  },

  // PAYMENT
  {
    id: 'pay-001',
    question: 'What payment methods do you accept?',
    answer: `We accept a wide variety of payment methods:

- **Credit/Debit Cards**: Visa, Mastercard, American Express, Discover, Diners Club
- **Digital Wallets**: Apple Pay, Google Pay, Shop Pay, PayPal, Venmo

All transactions are secure and encrypted for your protection.`,
    category: 'payment',
    keywords: ['payment', 'pay', 'credit card', 'paypal', 'apple pay', 'methods', 'venmo'],
  },
  {
    id: 'pay-002',
    question: 'What is the price of a book?',
    answer: `Our personalized books are currently on sale!

**Sale Price**: $39.99 (regularly $59.99 - that's 33% off!)

All our books include:
- Your child's name throughout the story
- AI-generated illustration of your child
- Custom dedication page
- High-quality printing
- FREE standard shipping!`,
    category: 'payment',
    keywords: ['price', 'cost', 'how much', 'pricing', 'discount', 'sale'],
  },

  // GENERAL
  {
    id: 'gen-001',
    question: 'What books do you offer?',
    answer: `We have over 20 magical personalized books! Here are some favorites:

**Adventure Stories**: The Princess Inside, Superhero, Animal Adventure, The World of Dinosaurs, Space Adventure, Around The World

**Family Love**: How Much I Love Mommy, How Much I Love Daddy, My Heart Will Always Love You, How I Learn From Grandpa

**Special Themes**: Happy Birthday, Rainbow Unicorn Valley, Monster Truck Rally, The Championship Court, Child Dream Big

**Faith & Values**: With God Beside You, Little Book of Gratitude & Grace, The Beautiful Way

And many more! Each book is $39.99 (33% off!) and can be fully personalized with your child's name and photo.`,
    category: 'general',
    keywords: ['books', 'offer', 'available', 'titles', 'stories', 'what', 'options'],
  },
  {
    id: 'gen-002',
    question: 'What age range are the books for?',
    answer: `Our books are designed for children ages 0-12, with different titles suited for different ages:

- **0-3 years**: My Heart Will Always Love You, How Much I Love Mommy/Daddy
- **2-6 years**: A Day at the Farm, The ABC Treasure Hunt
- **3-8 years**: Most of our titles including Princess Inside, Superhero, Animal Adventure, Dinosaurs
- **4-12 years**: Space Adventure, Around The World, Championship Court, K-Pop

Each product page shows the recommended age range!`,
    category: 'general',
    keywords: ['age', 'years old', 'range', 'appropriate', 'child', 'kids'],
  },
  {
    id: 'gen-003',
    question: 'How do I contact customer support?',
    answer: `You're already in the right place! I'm here to help 24/7.

For more complex issues, you can also:
- **Email**: support@tellmytale.com
- **Office Hours**: Monday-Friday 8AM-6PM & Saturday 9AM-5PM

We're here to make sure you and your little one are delighted with your book!`,
    category: 'general',
    keywords: ['contact', 'support', 'help', 'email', 'reach', 'customer service'],
  },
  {
    id: 'gen-004',
    question: 'Is your Florida facility really almost sold out?',
    answer: `Yes! We've been going viral lately and our Florida studio is nearly at capacity.

We're working hard to keep up with demand, but we recommend ordering soon to secure your book before we need to pause new orders.

Current processing time is still 5-10 business days, but this may increase as we get busier!`,
    category: 'general',
    keywords: ['viral', 'sold out', 'florida', 'capacity', 'busy', 'demand'],
  },
];

# CMS Bookings Migration (বাংলা)

## পরিবর্তন
- Service Requests পেইজের booking cards (Total bookings, New requests, In progress, Completed) CMS → Bookings পেইজে স্থানান্তর করা হয়েছে।
- Booking list, search/filter, status update, technician assignment এবং booking delete CMS Bookings পেইজে যুক্ত করা হয়েছে।
- Service Requests header থেকে Business Control এবং Management Center বাটন সরানো হয়েছে।
- Business Control এবং Management Center CMS-এর left navigation-এ যোগ করা হয়েছে; এগুলো যথাক্রমে `/admin/business-control` এবং `/admin/management` পেইজে যায়।

## যাচাই
- ZIP তৈরি করা হয়েছে। Frontend build চালানোর চেষ্টা করা হয়েছিল, কিন্তু npm dependency installation timeout হওয়ায় `vite` পাওয়া যায়নি; তাই build/browser runtime verification সম্পন্ন হয়নি।

// Static data for the website

// Blood types data
const bloodTypes = [
    {
        type: 'A+',
        description: 'Second most common blood type',
        canDonateTo: ['A+', 'AB+'],
        canReceiveFrom: ['A+', 'A-', 'O+', 'O-']
    },
    {
        type: 'A-',
        description: 'Universal platelet donor',
        canDonateTo: ['A+', 'A-', 'AB+', 'AB-'],
        canReceiveFrom: ['A-', 'O-']
    },
    {
        type: 'B+',
        description: 'Third most common blood type',
        canDonateTo: ['B+', 'AB+'],
        canReceiveFrom: ['B+', 'B-', 'O+', 'O-']
    },
    {
        type: 'B-',
        description: 'Can donate to all B and AB types',
        canDonateTo: ['B+', 'B-', 'AB+', 'AB-'],
        canReceiveFrom: ['B-', 'O-']
    },
    {
        type: 'AB+',
        description: 'Universal plasma donor',
        canDonateTo: ['AB+'],
        canReceiveFrom: ['All Blood Types']
    },
    {
        type: 'AB-',
        description: 'Rarest blood type',
        canDonateTo: ['AB+', 'AB-'],
        canReceiveFrom: ['All Negative Types']
    },
    {
        type: 'O+',
        description: 'Most common blood type',
        canDonateTo: ['All Positive Types'],
        canReceiveFrom: ['O+', 'O-']
    },
    {
        type: 'O-',
        description: 'Universal donor',
        canDonateTo: ['All Blood Types'],
        canReceiveFrom: ['O-']
    }
];

// Donation centers data
const donationCenters = [
    {
        name: 'Central Blood Bank',
        address: '123 Main Street, Downtown',
        phone: '(555) 123-4567',
        hours: 'Mon-Sat: 8:00 AM - 8:00 PM'
    },
    {
        name: 'Community Blood Center',
        address: '456 Park Avenue, Midtown',
        phone: '(555) 987-6543',
        hours: 'Mon-Sun: 9:00 AM - 6:00 PM'
    },
    {
        name: 'Regional Blood Donation Hub',
        address: '789 West Street, Uptown',
        phone: '(555) 456-7890',
        hours: 'Mon-Fri: 7:00 AM - 9:00 PM'
    }
];

// Testimonials data
const testimonials = [
    {
        id: 1,
        name: 'ABC',
        quote: "Donating blood regularly makes me feel like I'm making a real difference in people's lives.",
        image: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
        donatedTimes: 12
    },
    {
        id: 2,
        name: 'XYZ',
        quote: 'After my sister needed blood transfusions, I realized how important regular donors are.',
        image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
        donatedTimes: 8
    },
    {
        id: 3,
        name: 'WXY',
        quote: 'The process is quick and easy, and the staff always makes me feel comfortable.',
        image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
        donatedTimes: 15
    }
];

// Make data available globally
window.bloodTypes = bloodTypes;
window.donationCenters = donationCenters;
window.testimonials = testimonials;
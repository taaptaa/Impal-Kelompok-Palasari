import { Item, LoanRequest, User, DashboardStats } from '../types';

// Use Case #1 - Database User Entity dengan credentials untuk AuthController
export const mockUsers = [
  {
    id: 'STD001',
    name: 'Ahmad Rizki',
    password: 'student123',
    email: 'ahmad.rizki@student.telkomuniversity.ac.id',
    role: 'student' as const,
    avatar: 'https://ui-avatars.com/api/?name=Ahmad+Rizki&background=2563EB&color=fff'
  },
  {
    id: 'STD002',
    name: 'Siti Nurhaliza',
    password: 'student123',
    email: 'siti.nur@student.telkomuniversity.ac.id',
    role: 'student' as const,
    avatar: 'https://ui-avatars.com/api/?name=Siti+Nurhaliza&background=2563EB&color=fff'
  },
  {
    id: 'ADM001',
    name: 'Admin Utama',
    password: 'admin123',
    email: 'admin@smartlend.telkomuniversity.ac.id',
    role: 'admin' as const,
    avatar: 'https://ui-avatars.com/api/?name=Admin+Utama&background=10B981&color=fff'
  },
  {
    id: 'WRH001',
    name: 'Petugas Gudang',
    password: 'warehouse123',
    email: 'warehouse@smartlend.telkomuniversity.ac.id',
    role: 'warehouse' as const,
    avatar: 'https://ui-avatars.com/api/?name=Petugas+Gudang&background=F59E0B&color=fff'
  }
];

export const mockItems: Item[] = [
  {
    id: '1',
    name: 'Kursi Lipat',
    description: 'Kursi lipat portable untuk acara',
    category: 'furniture',
    imageUrl: 'https://images.unsplash.com/photo-1554941829-fcef7b298d5d?w=400',
    totalStock: 50,
    availableStock: 35,
    status: 'available',
    condition: 'Baik, mudah dilipat',
    specifications: ['Material: Metal & Plastic', 'Kapasitas: 120kg', 'Warna: Putih']
  },
  {
    id: '2',
    name: 'Proyektor LCD',
    description: 'Proyektor untuk presentasi dan acara',
    category: 'electronics',
    imageUrl: 'https://images.unsplash.com/photo-1762186540875-4c6bf133ac13?w=400',
    totalStock: 8,
    availableStock: 2,
    status: 'low-stock',
    condition: 'Sangat baik, dengan remote',
    specifications: ['Resolusi: 1920x1080', 'Brightness: 3200 lumens', 'HDMI & VGA']
  },
  {
    id: '3',
    name: 'Meja Konferensi',
    description: 'Meja besar untuk rapat dan acara',
    category: 'furniture',
    imageUrl: 'https://images.unsplash.com/photo-1628062699790-7c45262b82b4?w=400',
    totalStock: 15,
    availableStock: 8,
    status: 'available',
    condition: 'Baik, dapat diatur tinggi',
    specifications: ['Ukuran: 180x80cm', 'Material: Kayu', 'Kapasitas: 8 orang']
  },
  {
    id: '4',
    name: 'Sound System Portable',
    description: 'Speaker portable dengan mic wireless',
    category: 'electronics',
    imageUrl: 'https://images.unsplash.com/photo-1504904126298-3fde501c9b31?w=400',
    totalStock: 5,
    availableStock: 0,
    status: 'out-of-stock',
    condition: 'Sangat baik, dengan 2 mic',
    specifications: ['Power: 200W', 'Battery: 6 jam', 'Bluetooth & USB']
  },
  {
    id: '5',
    name: 'Microphone Wireless',
    description: 'Mic wireless untuk acara',
    category: 'electronics',
    imageUrl: 'https://images.unsplash.com/photo-1745848413041-3eeb106db501?w=400',
    totalStock: 12,
    availableStock: 7,
    status: 'available',
    condition: 'Baik, dengan receiver',
    specifications: ['Tipe: UHF Wireless', 'Range: 50m', 'Battery: AA']
  },
  {
    id: '6',
    name: 'Kabel Roll Extension',
    description: 'Kabel gulung 20 meter',
    category: 'electronics',
    imageUrl: 'https://images.unsplash.com/photo-1698183168555-35305511ae52?w=400',
    totalStock: 10,
    availableStock: 4,
    status: 'available',
    condition: 'Baik, 4 stop kontak',
    specifications: ['Panjang: 20m', 'Stop Kontak: 4', 'Daya: 2200W']
  }
];

export const mockLoanRequests: LoanRequest[] = [
  {
    id: 'LR001',
    studentId: 'STD001',
    studentName: 'Ahmad Rizki',
    studentEmail: 'ahmad.rizki@mail.com',
    itemId: '1',
    itemName: 'Kursi Lipat',
    itemImage: 'https://images.unsplash.com/photo-1554941829-fcef7b298d5d?w=200',
    quantity: 20,
    borrowDate: '2024-01-15',
    returnDate: '2024-01-17',
    reason: 'Untuk acara seminar mahasiswa program studi Teknik Informatika',
    status: 'pending',
    requestDate: '2024-01-10',
  },
  {
    id: 'LR002',
    studentId: 'STD002',
    studentName: 'Siti Nurhaliza',
    studentEmail: 'siti.nur@mail.com',
    itemId: '2',
    itemName: 'Proyektor LCD',
    itemImage: 'https://images.unsplash.com/photo-1762186540875-4c6bf133ac13?w=200',
    quantity: 1,
    borrowDate: '2024-01-12',
    returnDate: '2024-01-13',
    reason: 'Presentasi tugas akhir mahasiswa semester 8',
    status: 'approved',
    requestDate: '2024-01-08',
    qrCode: 'SMARTLEND:LR002:2:1',
    approvedBy: 'Admin Utama',
    approvedDate: '2024-01-09'
  },
  {
    id: 'LR003',
    studentId: 'STD003',
    studentName: 'Budi Santoso',
    studentEmail: 'budi.s@mail.com',
    itemId: '3',
    itemName: 'Meja Konferensi',
    itemImage: 'https://images.unsplash.com/photo-1628062699790-7c45262b82b4?w=200',
    quantity: 3,
    borrowDate: '2024-01-08',
    returnDate: '2024-01-10',
    reason: 'Rapat koordinasi BEM periode 2024',
    status: 'active',
    requestDate: '2024-01-05',
    qrCode: 'SMARTLEND:LR003:3:3',
    approvedBy: 'Admin Utama',
    approvedDate: '2024-01-06',
    pickedUpDate: '2024-01-08'
  },
  {
    id: 'LR004',
    studentId: 'STD004',
    studentName: 'Dewi Lestari',
    studentEmail: 'dewi.l@mail.com',
    itemId: '5',
    itemName: 'Microphone Wireless',
    itemImage: 'https://images.unsplash.com/photo-1745848413041-3eeb106db501?w=200',
    quantity: 2,
    borrowDate: '2023-12-28',
    returnDate: '2023-12-30',
    reason: 'Acara festival musik kampus',
    status: 'completed',
    requestDate: '2023-12-20',
    qrCode: 'SMARTLEND:LR004:5:2',
    approvedBy: 'Admin Utama',
    approvedDate: '2023-12-21',
    pickedUpDate: '2023-12-28',
    actualReturnDate: '2023-12-30',
    returnCondition: 'good'
  },
  {
    id: 'LR005',
    studentId: 'STD005',
    studentName: 'Eko Prasetyo',
    studentEmail: 'eko.p@mail.com',
    itemId: '4',
    itemName: 'Sound System Portable',
    itemImage: 'https://images.unsplash.com/photo-1504904126298-3fde501c9b31?w=200',
    quantity: 1,
    borrowDate: '2024-01-14',
    returnDate: '2024-01-16',
    reason: 'Acara pentas seni mahasiswa',
    status: 'pending',
    requestDate: '2024-01-10',
  },
  {
    id: 'LR006',
    studentId: 'STD006',
    studentName: 'Fitri Handayani',
    studentEmail: 'fitri.h@mail.com',
    itemId: '1',
    itemName: 'Kursi Lipat',
    itemImage: 'https://images.unsplash.com/photo-1554941829-fcef7b298d5d?w=200',
    quantity: 15,
    borrowDate: '2024-01-11',
    returnDate: '2024-01-12',
    reason: 'Workshop desain grafis untuk mahasiswa baru',
    status: 'approved',
    requestDate: '2024-01-08',
    qrCode: 'SMARTLEND:LR006:1:15',
    approvedBy: 'Admin Utama',
    approvedDate: '2024-01-09'
  },
  {
    id: 'LR007',
    studentId: 'STD007',
    studentName: 'Hendra Gunawan',
    studentEmail: 'hendra.g@mail.com',
    itemId: '6',
    itemName: 'Kabel Roll Extension',
    itemImage: 'https://images.unsplash.com/photo-1698183168555-35305511ae52?w=200',
    quantity: 2,
    borrowDate: '2023-12-25',
    returnDate: '2023-12-27',
    reason: 'Pameran project IoT mahasiswa',
    status: 'completed',
    requestDate: '2023-12-22',
    qrCode: 'SMARTLEND:LR007:6:2',
    approvedBy: 'Admin Utama',
    approvedDate: '2023-12-23',
    pickedUpDate: '2023-12-25',
    actualReturnDate: '2023-12-27',
    returnCondition: 'good'
  }
];

export const mockDashboardStats: DashboardStats = {
  totalLoans: 127,
  activeLoans: 23,
  itemsOut: 45,
  criticalStock: 3
};
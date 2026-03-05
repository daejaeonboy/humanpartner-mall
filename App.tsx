import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Layout/Header';
import { BottomNav } from './components/Layout/BottomNav';
import { Footer } from './components/Layout/Footer';
import { MainPage } from './pages/MainPage';
import { ProductListPage } from './pages/ProductListPage';
import { ProductDetailPage } from './pages/ProductDetail';
import { MyPage } from './pages/MyPage';
import { MyInfoPage } from './pages/MyInfoPage';
import { InquiryPage } from './pages/InquiryPage';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { RedirectToProduct } from './pages/RedirectToProduct';
import { CSCenter } from './pages/CSCenter';
import { ProductSearchResult } from './pages/ProductSearchResult';
import { CompanyIntro } from './pages/CompanyIntro';
import { TermsOfService } from './pages/TermsOfService';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { MiceBoardPage } from './pages/MiceBoardPage';
import { GnbPostDetailPage } from './pages/GnbPostDetailPage';
import { BlankPage } from './pages/BlankPage';
import { NotFound } from './pages/NotFound';
import { AuthProvider } from './src/context/AuthContext';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ProductManager } from './pages/admin/ProductManager';
import { BookingList } from './pages/admin/BookingList';
import { SectionManager } from './pages/admin/SectionManager';
import { CategoryManager } from './pages/admin/CategoryManager';
import { CMSManager } from './pages/admin/CMSManager';
import { UserManager } from './pages/admin/UserManager';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminSignup } from './pages/admin/AdminSignup';
import { NavMenuManager } from './pages/admin/NavMenuManager';
import { FAQManager } from './pages/admin/FAQManager';
import { InquiryManager } from './pages/admin/InquiryManager';
import { GnbSectionManager } from './pages/admin/GnbSectionManager';
import { AdminRoute } from './src/components/AdminRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Admin Routes - Protected */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>}>
            <Route path="cms" element={<CMSManager />} />
            <Route path="sections" element={<SectionManager />} />
            <Route path="categories" element={<CategoryManager />} />
            <Route path="products" element={<ProductManager />} />
            <Route path="rental-requests" element={<BookingList />} />
            <Route path="bookings" element={<Navigate to="/admin/rental-requests" replace />} />
            <Route path="users" element={<UserManager />} />
            <Route path="menus" element={<NavMenuManager />} />
            <Route path="faqs" element={<FAQManager />} />
            <Route path="inquiries" element={<InquiryManager />} />
            <Route path="gnb-sections" element={<GnbSectionManager />} />
            <Route path="mice-tabs" element={<Navigate to="/admin/gnb-sections" replace />} />
          </Route>

          {/* Admin Login - Separate Route */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/signup" element={<AdminSignup />} />

          {/* Public Routes */}
          <Route
            path="/*"
            element={
              <div className="min-h-screen bg-white">
                <Header />
                <Routes>
                  <Route path="/" element={<MainPage />} />
                  <Route path="/products" element={<ProductListPage />} />
                  <Route path="/products/:id" element={<ProductDetailPage />} />
                  <Route path="/mypage" element={<MyPage />} />
                  <Route path="/mypage/info" element={<MyInfoPage />} />
                  <Route path="/mypage/inquiry" element={<InquiryPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/cs" element={<CSCenter />} />
                  <Route path="/p/:code" element={<RedirectToProduct />} />
                  <Route path="/search" element={<ProductSearchResult />} />
                  <Route path="/company" element={<CompanyIntro />} />
                  <Route path="/notice" element={<MiceBoardPage boardType="notice" />} />
                  <Route path="/notice/:id" element={<GnbPostDetailPage boardType="notice" />} />
                  <Route path="/event" element={<MiceBoardPage boardType="event" />} />
                  <Route path="/event/:id" element={<GnbPostDetailPage boardType="event" />} />
                  <Route path="/review" element={<MiceBoardPage boardType="review" />} />
                  <Route path="/review/:id" element={<GnbPostDetailPage boardType="review" />} />
                  <Route path="/blank" element={<BlankPage />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <Footer />
              </div>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

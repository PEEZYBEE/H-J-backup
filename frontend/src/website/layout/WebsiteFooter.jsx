import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FaFacebook,
  FaInstagram,
  FaWhatsapp,
  FaEnvelope,
  FaPhone,
  FaStore,
  FaUserFriends,
  FaGift,
} from 'react-icons/fa';
import { SiTiktok } from 'react-icons/si';

const WebsiteFooter = () => {
  const isLoggedIn = !!localStorage.getItem('token');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-[#FF416C] to-[#FF4B2B] text-white py-10 mt-auto">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-red-600">HNj</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">HNj Store</h2>
                <p className="text-sm text-red-100">Quality products for everyday needs</p>
              </div>
            </div>
            <p className="text-sm text-white/90 leading-relaxed">
              Shop trusted essentials, discover new arrivals, and enjoy a smooth checkout experience.
              We focus on value, convenience, and fast support.
            </p>
            <div className="flex space-x-4 pt-2">
              <a href="https://www.tiktok.com/@h.j.collection?_t=8ojABXrdhJ7&_r=1" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-all duration-300 transform hover:scale-110 hover:rotate-3" title="TikTok">
                <SiTiktok size={22} />
              </a>
              <a href="https://wa.me/254714753950" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-all duration-300 transform hover:scale-110 hover:rotate-3" title="WhatsApp">
                <FaWhatsapp size={22} />
              </a>
              <a href="https://www.instagram.com/h_jcollection?igsh=eWF3cXJpdDljamYz" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-all duration-300 transform hover:scale-110 hover:rotate-3" title="Instagram">
                <FaInstagram size={22} />
              </a>
              <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-all duration-300 transform hover:scale-110 hover:rotate-3" title="Facebook">
                <FaFacebook size={22} />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center">
              <FaStore className="mr-2" />
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <NavLink to="/" className="hover:text-white transition-colors duration-300 text-sm flex items-center group">
                  <span className="w-0 group-hover:w-2 h-0.5 bg-white mr-0 group-hover:mr-2 transition-all duration-300"></span>
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink to="/shop" className="hover:text-white transition-colors duration-300 text-sm flex items-center group">
                  <span className="w-0 group-hover:w-2 h-0.5 bg-white mr-0 group-hover:mr-2 transition-all duration-300"></span>
                  Shop
                </NavLink>
              </li>
              {isLoggedIn ? (
                <li>
                  <NavLink to="/dashboard" className="hover:text-white transition-colors duration-300 text-sm flex items-center group">
                    <span className="w-0 group-hover:w-2 h-0.5 bg-white mr-0 group-hover:mr-2 transition-all duration-300"></span>
                    Dashboard
                  </NavLink>
                </li>
              ) : (
                <li>
                  <NavLink to="/auth" className="hover:text-white transition-colors duration-300 text-sm flex items-center group">
                    <span className="w-0 group-hover:w-2 h-0.5 bg-white mr-0 group-hover:mr-2 transition-all duration-300"></span>
                    Login / Register
                  </NavLink>
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center">
              <FaGift className="mr-2" />
              Customer Care
            </h3>
            <ul className="space-y-2">
              <li className="flex items-center text-sm"><div className="w-2 h-2 bg-white rounded-full mr-3"></div>Safe checkout experience</li>
              <li className="flex items-center text-sm"><div className="w-2 h-2 bg-white rounded-full mr-3"></div>Order updates and tracking</li>
              <li className="flex items-center text-sm"><div className="w-2 h-2 bg-white rounded-full mr-3"></div>Responsive support team</li>
              <li className="flex items-center text-sm"><div className="w-2 h-2 bg-white rounded-full mr-3"></div>Returns and issue resolution</li>
              <li className="flex items-center text-sm"><div className="w-2 h-2 bg-white rounded-full mr-3"></div>Weekly offers and deals</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center">
              <FaUserFriends className="mr-2" />
              Contact Us
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 group cursor-pointer">
                <div className="mt-1">
                  <FaEnvelope className="text-white/80 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <a href="mailto:hnjcollection1@gmail.com" className="text-sm text-white/90 hover:text-white transition-colors">
                    hnjcollection1@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-3 group cursor-pointer">
                <div className="mt-1">
                  <FaPhone className="text-white/80 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <a href="tel:+254714753950" className="text-sm text-white/90 hover:text-white transition-colors">
                    +254714753950
                  </a>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-sm font-medium mb-2">Business Hours</p>
                <p className="text-sm text-white/90">Mon - Fri: 8:00 AM - 4:00 PM</p>
              </div>

              <div className="pt-2">
                <p className="text-sm font-medium mb-2">Pickup Point</p>
                <p className="text-sm text-white/90">Dynamic Mall 3rd floor ML 151, Tom Mboya Street, Nairobi, Kenya</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 pt-6 flex items-center justify-center">
          <p className="text-sm text-white/90">© {currentYear} HNj Store. Where your next favourite thing lives.</p>
        </div>
      </div>
    </footer>
  );
};

export default WebsiteFooter;
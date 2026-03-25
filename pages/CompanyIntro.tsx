import React from 'react';
import { Container } from '../components/ui/Container';
import { Helmet } from 'react-helmet-async';
import { LayoutTemplate, Network, Wrench, Calculator } from 'lucide-react';

export const CompanyIntro: React.FC = () => {
    return (
        <div className="bg-white min-h-screen">
            <Helmet>
                <title>회사소개 | 렌탈파트너</title>
                <meta name="description" content="렌탈파트너 회사소개입니다. 복합기, 노트북, 데스크탑 등 사무기기 렌탈 서비스를 제공합니다." />
                <link rel="canonical" href="https://rentalpartner.kr/company" />
            </Helmet>

            {/* Hero Section */}
            <div className="relative py-24 bg-slate-900 text-white overflow-hidden">
                <div className="absolute inset-0 bg-black/60 z-10"></div>
                {/* Background Image Placeholder - Replace with actual company image if available */}
                <img
                    src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80"
                    alt="Company Hero"
                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                />
                <Container className="relative z-20 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ lineHeight: 1.4 }}>
                        고객의 업무 운영을 위한<br />
                        <span className="text-[#001E45]">최고의 파트너</span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto break-keep leading-relaxed">
                        렌탈파트너는 복합기, 노트북, 데스크탑 등 사무기기 렌탈 운영 경험을 바탕으로<br className="hidden md:block" /> 표준화된 장비 공급 환경을 제공합니다.
                    </p>
                </Container>
            </div>

            {/* Vision & Mission Section */}
            <section className="py-20">
                <Container>
                    <div className="flex flex-col md:flex-row gap-12 items-center">
                        <div className="flex-1">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6 break-keep">
                                ABOUT <span className="text-[#001E45]">렌탈파트너</span>
                            </h2>
                            <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-6 break-keep">
                                렌탈파트너는 기업과 공공기관의 장비 운영 수요를 바탕으로<br className="hidden md:block" /> 설계된 사무기기 렌탈 플랫폼입니다.
                            </p>
                            <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-6 break-keep">
                                렌탈파트너의 10년 이상 축적된 현장 노하우를 기반으로,<br className="hidden md:block" /> 장비 준비 과정에서 발생하는 비효율을 줄이고<br className="hidden md:block" /> 견적·대여·설치 과정을 표준화하여 제공합니다.
                            </p>
                            <p className="text-base md:text-lg text-gray-600 leading-relaxed break-keep">
                                소규모 사무실부터 대규모 기관 운영까지,<br className="hidden md:block" /> 단순 장비 공급을 넘어 안정적인 렌탈 운영 기준을 제공하는 파트너입니다.
                            </p>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-6 rounded-2xl text-center hover:shadow-lg transition-all border border-slate-100 flex flex-col items-center justify-center">
                                <LayoutTemplate className="w-10 h-10 text-[#001E45] mb-3" />
                                <h3 className="font-bold text-slate-800 mb-1">렌탈 운영 표준화</h3>
                                <p className="text-sm text-gray-500 break-keep">장비 유형별 패키지 기반 구성 제공</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl text-center hover:shadow-lg transition-all border border-slate-100 flex flex-col items-center justify-center">
                                <Network className="w-10 h-10 text-[#001E45] mb-3" />
                                <h3 className="font-bold text-slate-800 mb-1">협업 구조 관리</h3>
                                <p className="text-sm text-gray-500 break-keep">회원사·협력사 역할 분담 및 이력 기록</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl text-center hover:shadow-lg transition-all border border-slate-100 flex flex-col items-center justify-center">
                                <Wrench className="w-10 h-10 text-[#001E45] mb-3" />
                                <h3 className="font-bold text-slate-800 mb-1">실질 운영 지원</h3>
                                <p className="text-sm text-gray-500 break-keep">현장 설치·운영·기술 책임 체계</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl text-center hover:shadow-lg transition-all border border-slate-100 flex flex-col items-center justify-center">
                                <Calculator className="w-10 h-10 text-[#001E45] mb-3" />
                                <h3 className="font-bold text-slate-800 mb-1">예산 예측 가능</h3>
                                <p className="text-sm text-gray-500 break-keep">기본 시작가 공개로 합리적 예산 계획</p>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* Core Values / Services Placeholder */}
            <section className="py-20 bg-slate-50">
                <Container>
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-800 mb-4">OUR SERVICES</h2>
                        <p className="text-gray-500">렌탈파트너가 제공하는 핵심 서비스 분야입니다.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Service 1 */}
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                            <div className="h-48 bg-gray-200 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80" alt="Rental" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold mb-2 group-hover:text-[#001E45] transition-colors">사무기기 렌탈</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    복합기, 노트북, 데스크탑 등 업무에 필요한 핵심 장비를 합리적인 가격에 렌탈합니다.
                                </p>
                            </div>
                        </div>

                        {/* Service 2 */}
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                            <div className="h-48 bg-gray-200 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80" alt="Planning" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold mb-2 group-hover:text-[#001E45] transition-colors">공간 연출 및 기획</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    단순 설치를 넘어 업무 환경에 맞는 장비 구성과 배치를 제안합니다.
                                </p>
                            </div>
                        </div>

                        {/* Service 3 */}
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                            <div className="h-48 bg-gray-200 relative overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80" alt="Operation" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold mb-2 group-hover:text-[#001E45] transition-colors">현장 운영 지원</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    전문 엔지니어가 설치와 운영을 지원해 안정적인 업무 진행을 돕습니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>


        </div>
    );
};

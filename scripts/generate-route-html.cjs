const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const baseHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(baseHtmlPath)) {
  throw new Error(`Missing build output: ${baseHtmlPath}`);
}

const baseHtml = fs.readFileSync(baseHtmlPath, 'utf8');

const routePages = [
  {
    route: '/products',
    title: '상품목록 | 렌탈파트너',
    description: '복합기, 노트북, 데스크탑 등 렌탈파트너의 사무기기 렌탈 상품을 확인해보세요.',
  },
  {
    route: '/company',
    title: '회사소개 | 렌탈파트너',
    description: '렌탈파트너 회사소개입니다. 복합기, 노트북, 데스크탑 등 사무기기 렌탈 서비스를 제공합니다.',
  },
  {
    route: '/cs',
    title: '고객센터 | 렌탈파트너',
    description: '렌탈파트너 고객센터입니다. 자주 묻는 질문부터 실시간 상담까지 도와드립니다.',
  },
  {
    route: '/notice',
    title: '공지사항 - 렌탈파트너',
    description: '렌탈파트너 공지사항 페이지입니다.',
  },
  {
    route: '/event',
    title: '이벤트 - 렌탈파트너',
    description: '렌탈파트너 이벤트 페이지입니다.',
  },
  {
    route: '/review',
    title: '설치후기 - 렌탈파트너',
    description: '렌탈파트너 설치후기 페이지입니다.',
  },
  {
    route: '/terms',
    title: '서비스 이용약관 | 렌탈파트너',
    description: '렌탈파트너 서비스 이용약관입니다. 회원가입, 견적 요청 접수, 계약/정산, 취소/환불, 권리·의무 및 책임사항을 안내합니다.',
  },
  {
    route: '/privacy',
    title: '개인정보처리방침 | 렌탈파트너',
    description: '렌탈파트너 서비스의 개인정보처리방침입니다. 수집 항목, 이용 목적, 보유 기간, 이용자 권리 및 보호조치를 안내합니다.',
  },
  {
    route: '/login',
    title: '로그인 | 렌탈파트너',
    description: '렌탈파트너 로그인 페이지입니다.',
    robots: 'noindex, nofollow',
  },
  {
    route: '/signup',
    title: '회원가입 | 렌탈파트너',
    description: '렌탈파트너 회원가입 페이지입니다.',
    robots: 'noindex, nofollow',
  },
  {
    route: '/quote-cart',
    title: '장바구니 | 렌탈파트너',
    description: '여러 품목을 장바구니에 담아 한 번에 견적 요청하세요. 온라인에서는 결제 없이 견적 접수만 진행됩니다.',
    robots: 'noindex, nofollow',
  },
  {
    route: '/search',
    title: '검색 결과 - 렌탈파트너',
    description: '렌탈파트너 사이트 내 검색 결과 페이지입니다.',
    robots: 'noindex, nofollow',
  },
];

function replaceTag(html, regex, replacement) {
  return regex.test(html) ? html.replace(regex, replacement) : html;
}

function upsertRobots(html, value) {
  const robotsRegex = /<meta\s+name="robots"\s+content="[^"]*"\s*\/>/s;
  const robotsTag = `    <meta name="robots" content="${value}" />`;

  if (robotsRegex.test(html)) {
    return html.replace(robotsRegex, robotsTag);
  }

  return html.replace(
    /(<meta\s+name="description"\s+content="[^"]*"\s*\/>)/s,
    `$1\n${robotsTag}`
  );
}

function buildRouteHtml(page) {
  const canonical = `https://rentalpartner.kr${page.route}`;
  let html = baseHtml;

  html = replaceTag(html, /<title>[\s\S]*?<\/title>/, `    <title>${page.title}</title>`);
  html = replaceTag(
    html,
    /<link rel="canonical" href="[^"]*" \/>/s,
    `    <link rel="canonical" href="${canonical}" />`
  );
  html = replaceTag(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/s,
    `    <meta name="description" content="${page.description}" />`
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/s,
    `    <meta property="og:url" content="${canonical}" />`
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/s,
    `    <meta property="og:title" content="${page.title}" />`
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/s,
    `    <meta property="og:description" content="${page.description}" />`
  );
  html = replaceTag(
    html,
    /<meta\s+property="twitter:title"\s+content="[^"]*"\s*\/>/s,
    `    <meta property="twitter:title" content="${page.title}" />`
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/s,
    `    <meta name="twitter:description" content="${page.description}" />`
  );

  if (page.robots) {
    html = upsertRobots(html, page.robots);
  }

  return html;
}

for (const page of routePages) {
  const targetDir = path.join(distDir, page.route.replace(/^\/+/, ''));
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'index.html'), buildRouteHtml(page), 'utf8');
}

console.log(`Generated prerendered HTML for ${routePages.length} routes.`);

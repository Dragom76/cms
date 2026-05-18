document.addEventListener("DOMContentLoaded", () => {
    const gnbHTML = `
        <header class="erp-header">
            <div class="header-top">
                <div class="logo">ERP SYSTEM</div>
                <div class="user-profile">관리자 님 (Admin)</div>
            </div>
            <nav class="header-nav">
                <ul>
                    <li class="active"><a href="#">게시물 관리</a></li>
                    <li><a href="#">시스템 설정</a></li>
                    <li><a href="#">로그 분석</a></li>
                </ul>
            </nav>
        </header>
    `;
    document.body.insertAdjacentHTML("afterbegin", gnbHTML);
});

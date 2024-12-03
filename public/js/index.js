window.addEventListener("load", function() {
	const mainSwiper = new Swiper(".mainSwiper", {
		loop: true,
		autoplay: {
			delay: 1500
		},
		pagination: {
		  el: ".swiper-pagination",
		},
	});
})
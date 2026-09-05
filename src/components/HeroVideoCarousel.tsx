import { useNavigate } from "react-router-dom";

const HeroVideoCarousel = () => {
    return (
        <div className="w-full px-0">
            <section className="relative w-full videomargin mt-20 h-[90vh] overflow-hidden">
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute hidden md:block inset-0 w-full h-full object-cover"
                >
                    <source src="/new.mp4" type="video/mp4" />
                </video>
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="block md:hidden w-full h-auto object-contain bg-[#FAF9F6] mobielvideo"
                >
                    <source src="/heromobile.mp4" type="video/mp4" />
                </video>
            </section>
        </div>
    );
};

export default HeroVideoCarousel;
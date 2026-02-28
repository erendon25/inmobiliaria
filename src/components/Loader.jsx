import logo from '../assets/logo.png';

const Loader = ({ fullScreen = false }) => {
    const content = (
        <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative flex items-center justify-center w-24 h-24">
                {/* Spinning outer ring */}
                <div className="absolute inset-0 border-4 border-gray-100/50 rounded-full border-t-[#fc7f51] animate-spin"></div>

                {/* Inner ring spinning opposite direction */}
                <div className="absolute inset-2 border-4 border-transparent rounded-full border-b-[#facc15] animate-spin [animation-direction:reverse] opacity-50"></div>

                {/* Pulsing centered logo */}
                <img
                    src={logo}
                    alt="Cargando..."
                    className="w-14 h-14 object-contain animate-pulse z-10 brightness-110 drop-shadow-sm"
                />
            </div>
            <p className="font-bold text-[#fc7f51] tracking-[0.2em] uppercase text-xs animate-pulse opacity-80">
                Cargando...
            </p>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-50 bg-[#16151a]/95 backdrop-blur-md flex items-center justify-center">
                {content}
            </div>
        );
    }

    return (
        <div className="py-24 flex items-center justify-center w-full">
            {content}
        </div>
    );
};

export default Loader;

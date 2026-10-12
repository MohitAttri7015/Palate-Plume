import CustomSlider from "./CustomSlider";

const img = (id, w = 800) =>
    `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const tastingProducts = [
    {
        id: 'signature-flat-white',
        name: 'Signature Flat White',
        price: 220,
        image: img('1495474472287-4d71bcdd2085'),
        hoverImage: img('1514432324607-a09d9b4aefdd'),
        badge: 'BEST SELLER',
    },
    {
        id: 'vanilla-cold-brew',
        name: 'Vanilla Cold Brew',
        price: 260,
        image: img('1497935586351-b67a49e012bf'),
        hoverImage: img('1517701604599-bb29b565090c'),
    },
    {
        id: 'butter-croissant',
        name: 'Butter Croissant',
        price: 180,
        image: img('1555507036-ab1f4038808a'),
        hoverImage: img('1509440159596-0249088772ff'),
    },
    {
        id: 'chocolate-truffle-cake',
        name: 'Chocolate Truffle Cake',
        price: 320,
        image: img('1578985545062-69928b1d9587'),
        hoverImage: img('1565958011703-44f9829ba187'),
        badge: 'NEW',
    },
    {
        id: 'house-espresso',
        name: 'House Espresso',
        price: 150,
        image: img('1509042239860-f550ce710b93'),
        hoverImage: img('1447933601403-0c6688de566e'),
    },
    {
        id: 'classic-cappuccino',
        name: 'Classic Cappuccino',
        price: 190,
        image: img('1572442388796-11668a67e53d'),
        hoverImage: img('1461023058943-07fcbe16d735'),
    },
];

export default function FeatureTasting(){
    return(
        <div className="text-white mt-[5rem] sm:px-12 px-4 py-8 flex flex-col gap-15">
            <div className="flex gap-4 flex-row items-center">
                <span className="w-2 h-2 bg-white"></span>
                <p className="font-ui text-[12px] tracking-[5px] uppercase">FEATURED TASTING</p>
            </div>

            <CustomSlider
                headerImage={img('1501339847302-ac426a4a7cbb', 1000)}
                headerTitle={<>AUTUMN<br />MENU 2026</>}
                headerButtonText="VIEW ALL"
                headerButtonLink="/menu"
                products={tastingProducts}
                currency="₹"
            />
            
        </div>
    )
}
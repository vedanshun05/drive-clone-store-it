import Image from "next/image";
import BrandLogo from "@/components/BrandLogo";
import ThemeIllustration from "@/components/ThemeIllustration";
import ThemeToggle from "@/components/ThemeToggle";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative flex min-h-screen">
      <ThemeToggle className="fixed right-4 top-4 z-50 size-11" />
      <section
        className="
          hidden w-1/2 items-center justify-center bg-brand p-10
          lg:flex
          xl:w-2/5
        "
      >
        <div
          className="
            flex max-h-[800px] max-w-[430px] flex-col justify-center space-y-12
          "
        >
          <Image
            src="/assets/icons/logo-full.svg"
            alt="logo"
            width={224}
            height={82}
            className="h-auto"
          />

          <div className="space-y-5 text-white">
            <h1 className="h1">Manage your files the best way</h1>
            <p className="body-1">
              This is a place where you can store all your documents.
            </p>
          </div>
          <ThemeIllustration
            original="/assets/images/files.png"
            width={342}
            height={342}
            className="
              transition-all
              hover:scale-105 hover:rotate-2
            "
          />
        </div>
      </section>

      <section className="
        flex flex-1 flex-col items-center bg-white p-4 py-10
        lg:justify-center lg:p-10 lg:py-0
      ">
        <div className="
          mb-16
          lg:hidden
        ">
          <BrandLogo
            variant="full"
            width={224}
            height={82}
            imgClassName="
              h-auto w-[200px]
              lg:w-[250px]
            "
          />
        </div>

        {children}
      </section>
    </div>
  );
};

export default Layout;

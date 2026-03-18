from setuptools import setup, find_packages

with open("requirements.txt") as f:
    install_requires = f.read().strip().split("\n")

setup(
    name="tradehub_core",
    version="0.0.1",
    description="TradeHub B2B Marketplace",
    author="TradeHub",
    author_email="info@tradehub.com",
    packages=find_packages(),
    zip_safe=False,
    include_package_data=True,
    install_requires=install_requires,
)

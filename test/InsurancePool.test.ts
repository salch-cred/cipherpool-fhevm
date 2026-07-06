import { expect } from "chai";
import { ethers } from "hardhat";

describe("InsurancePool", function () {
  it("mints shares 1:1 on first stake and lets LPs withdraw pro-rata", async function () {
    const [admin, lp1, lp2, core] = await ethers.getSigners();

    const InsurancePool = await ethers.getContractFactory("InsurancePool");
    const pool = await InsurancePool.connect(admin).deploy();
    await pool.waitForDeployment();

    await (await pool.connect(admin).setCipherTrust(core.address)).wait();

    await (await pool.connect(lp1).stake({ value: ethers.parseEther("1") })).wait();
    expect(await pool.sharesOf(lp1.address)).to.equal(ethers.parseEther("1"));

    // Simulate a slashing penalty forwarded by CipherTrust -- pool grows without new shares
    await (await pool.connect(core).receivePenalty(0, { value: ethers.parseEther("0.1") })).wait();

    await (await pool.connect(lp2).stake({ value: ethers.parseEther("1") })).wait();
    // lp2 stakes into a richer pool, so they receive fewer shares per wei than lp1 did
    expect(await pool.sharesOf(lp2.address)).to.be.lt(ethers.parseEther("1"));

    const lp1Shares = await pool.sharesOf(lp1.address);
    const before = await ethers.provider.getBalance(lp1.address);
    const tx = await pool.connect(lp1).withdraw(lp1Shares);
    const receipt = await tx.wait();
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;
    const after = await ethers.provider.getBalance(lp1.address);

    // lp1 should get back more than their original 1 ETH stake thanks to the penalty yield
    expect(after + gasCost - before).to.be.gt(ethers.parseEther("1"));
  });

  it("rejects receivePenalty from anyone other than CipherTrust", async function () {
    const [admin, stranger, core] = await ethers.getSigners();
    const InsurancePool = await ethers.getContractFactory("InsurancePool");
    const pool = await InsurancePool.connect(admin).deploy();
    await pool.waitForDeployment();
    await (await pool.connect(admin).setCipherTrust(core.address)).wait();

    await expect(
      pool.connect(stranger).receivePenalty(0, { value: ethers.parseEther("0.1") })
    ).to.be.revertedWith("InsurancePool: not CipherTrust");
  });
});

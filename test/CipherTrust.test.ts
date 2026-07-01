import { expect } from "chai";
import { ethers } from "hardhat";

// NOTE: this is a scaffold test. Once @fhevm/hardhat-plugin's mock/testing
// utilities are wired in (see zama-ai/fhevm-hardhat-template for the current
// conventions), extend these tests to build encrypted inputs via the fhevm
// mock instance instead of asserting only public-state behavior.
describe("CipherTrust", function () {
  it("registers an agent with admin-only access", async function () {
    const [admin, operator, stranger] = await ethers.getSigners();

    const CipherTrust = await ethers.getContractFactory("CipherTrust");
    const cipherTrust = await CipherTrust.connect(admin).deploy();
    await cipherTrust.waitForDeployment();

    await expect(cipherTrust.connect(stranger).registerAgent(operator.address)).to.be.revertedWith(
      "CipherTrust: not admin"
    );

    const tx = await cipherTrust.connect(admin).registerAgent(operator.address);
    await tx.wait();

    const agent = await cipherTrust.getAgent(0);
    expect(agent.operator).to.equal(operator.address);
    expect(agent.registered).to.equal(true);
    expect(agent.active).to.equal(true);
  });

  it("lets an operator deposit and withdraw a bond", async function () {
    const [admin, operator] = await ethers.getSigners();

    const CipherTrust = await ethers.getContractFactory("CipherTrust");
    const cipherTrust = await CipherTrust.connect(admin).deploy();
    await cipherTrust.waitForDeployment();

    await (await cipherTrust.connect(admin).registerAgent(operator.address)).wait();

    await (
      await cipherTrust.connect(operator).depositBond(0, { value: ethers.parseEther("1") })
    ).wait();

    let agent = await cipherTrust.getAgent(0);
    expect(agent.postedBond).to.equal(ethers.parseEther("1"));

    await (await cipherTrust.connect(operator).withdrawBond(0, ethers.parseEther("0.4"))).wait();

    agent = await cipherTrust.getAgent(0);
    expect(agent.postedBond).to.equal(ethers.parseEther("0.6"));
  });
});

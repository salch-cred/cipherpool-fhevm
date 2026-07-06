import { expect } from "chai";
import { ethers } from "hardhat";

describe("AgentIdentityRegistry", function () {
  it("registers an identity and allows the operator to delegate access", async function () {
    const [operator, delegate, stranger] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("AgentIdentityRegistry");
    const registry = await Registry.deploy();
    await registry.waitForDeployment();

    const tx = await registry.registerIdentity(operator.address, "delivery-robot", "ipfs://agent-metadata");
    await tx.wait();

    const identity = await registry.identities(0);
    expect(identity.operator).to.equal(operator.address);
    expect(identity.agentType).to.equal("delivery-robot");
    expect(identity.active).to.equal(true);

    expect(await registry.isActiveOperator(0, operator.address)).to.equal(true);
    expect(await registry.isActiveOperator(0, delegate.address)).to.equal(false);

    await (await registry.connect(operator).delegateOperator(0, delegate.address)).wait();
    expect(await registry.isActiveOperator(0, delegate.address)).to.equal(true);

    await expect(registry.connect(stranger).deactivate(0)).to.be.revertedWith(
      "AgentIdentityRegistry: not operator"
    );

    await (await registry.connect(operator).deactivate(0)).wait();
    expect(await registry.isActiveOperator(0, operator.address)).to.equal(false);
  });
});

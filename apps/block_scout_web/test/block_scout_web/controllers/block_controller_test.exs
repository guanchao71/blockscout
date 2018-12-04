defmodule BlockScoutWeb.BlockControllerTest do
  use BlockScoutWeb.ConnCase
  alias Explorer.Chain.Block

  describe "GET show/2" do
    test "with block redirects to block transactions route", %{conn: conn} do
      insert(:block, number: 3)
      conn = get(conn, "/blocks/3")
      assert redirected_to(conn) =~ "/blocks/3/transactions"
    end

    test "with uncle block redirects to block_hash route", %{conn: conn} do
      uncle = insert(:block, consensus: false)

      conn = get(conn, block_path(conn, :show, uncle))
      assert redirected_to(conn) =~ "/blocks/#{to_string(uncle.hash)}/transactions"
    end
  end

  describe "GET index/2" do
    test "returns all blocks", %{conn: conn} do
      4
      |> insert_list(:block)
      |> Stream.map(& &1.number)
      |> Enum.reverse()

      conn = get(conn, block_path(conn, :index), %{"type" => "JSON"})

      items = Map.get(json_response(conn, 200), "items")

      assert length(items) == 4
    end

    test "does not include uncles", %{conn: conn} do
      blocks =
        4
        |> insert_list(:block)
        |> Enum.reverse()

      for index <- 0..3 do
        uncle = insert(:block, consensus: false)
        insert(:block_second_degree_relation, uncle_hash: uncle.hash, nephew: Enum.at(blocks, index))
      end

      conn = get(conn, block_path(conn, :index), %{"type" => "JSON"})

      items = Map.get(json_response(conn, 200), "items")

      assert length(items) == 4
    end

    test "returns a block with two transactions", %{conn: conn} do
      block = insert(:block)

      2
      |> insert_list(:transaction)
      |> with_block(block)

      conn = get(conn, block_path(conn, :index), %{"type" => "JSON"})

      items = Map.get(json_response(conn, 200), "items")

      assert length(items) == 1
    end

    test "returns next page of results based on last seen block", %{conn: conn} do
      50
      |> insert_list(:block)
      |> Enum.map(& &1.number)

      block = insert(:block)

      conn =
        get(conn, block_path(conn, :index), %{
          "type" => "JSON",
          "block_number" => Integer.to_string(block.number)
        })

      items = Map.get(json_response(conn, 200), "items")

      assert length(items) == 50
    end

    test "next_page_path exist if not on last page", %{conn: conn} do
      %Block{number: number} =
        60
        |> insert_list(:block)
        |> Enum.fetch!(10)

      conn = get(conn, block_path(conn, :index), %{"type" => "JSON"})

      expected_path =
        block_path(conn, :index, %{
          block_number: number
        })

      assert Map.get(json_response(conn, 200), "next_page_path") == expected_path
    end

    test "next_page_path is empty if on last page", %{conn: conn} do
      insert(:block)

      conn = get(conn, block_path(conn, :index), %{"type" => "JSON"})

      assert Map.get(json_response(conn, 200), "next_page_path") == nil
    end

    test "displays miner primary address name", %{conn: conn} do
      miner_name = "POA Miner Pool"
      %{address: miner_address} = insert(:address_name, name: miner_name, primary: true)

      insert(:block, miner: miner_address, miner_hash: nil)

      conn = get(conn, block_path(conn, :index), %{"type" => "JSON"})

      items = Map.get(json_response(conn, 200), "items")

      assert List.first(items) =~ miner_name
    end
  end

  describe "GET reorgs/2" do
    test "returns all reorgs", %{conn: conn} do
      4
      |> insert_list(:block, consensus: false)
      |> Enum.map(& &1.hash)

      conn = get(conn, reorg_path(conn, :reorg), %{"type" => "JSON"})

      items = Map.get(json_response(conn, 200), "items")

      assert length(items) == 4
    end

    test "does not include blocks or uncles", %{conn: conn} do
      4
      |> insert_list(:block, consensus: false)
      |> Enum.map(& &1.hash)

      insert(:block)
      uncle = insert(:block, consensus: false)
      insert(:block_second_degree_relation, uncle_hash: uncle.hash)

      conn = get(conn, reorg_path(conn, :reorg), %{"type" => "JSON"})

      items = Map.get(json_response(conn, 200), "items")

      assert length(items) == 4
    end
  end

  describe "GET uncle/2" do
    test "returns all uncles", %{conn: conn} do
      for _index <- 1..4 do
        uncle = insert(:block, consensus: false)
        insert(:block_second_degree_relation, uncle_hash: uncle.hash)
        uncle.hash
      end

      conn = get(conn, uncle_path(conn, :uncle), %{"type" => "JSON"})

      items = Map.get(json_response(conn, 200), "items")

      assert length(items) == 4
    end

    test "does not include blocks or reorgs", %{conn: conn} do
      for _index <- 1..4 do
        uncle = insert(:block, consensus: false)
        insert(:block_second_degree_relation, uncle_hash: uncle.hash)
        uncle.hash
      end

      insert(:block)
      insert(:block, consensus: false)

      conn = get(conn, uncle_path(conn, :uncle), %{"type" => "JSON"})

      items = Map.get(json_response(conn, 200), "items")

      assert length(items) == 4
    end
  end
end
